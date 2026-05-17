---
name: Fix F-29 One-Click Reset Link
overview: Replace the 6-digit code reset flow with a one-click link. Email contains a 32-byte high-entropy token in a URL; users click and land directly on the new-password screen. The verify-code endpoint and the intermediate UI step are removed entirely. Adjacent cleanups (DB column rename, constant rename, expiry-source alignment, duplicate enum consolidation) are folded in.
todos:
  - id: db-schema
    content: Rename PasswordResetTokens.reset_code to token_hash and rename the index in database.sql
    status: completed
  - id: app-config
    content: Create src/core/config/app.ts with frozen APP_CONFIG.frontendUrl sourced from FRONTEND_URL env (dev fallback to http://localhost:5173, fail-fast in production)
    status: completed
  - id: constants
    content: "Consolidate SuccessMessages into errors/constants.ts: add RESET_LINK_SENT, INVALID_RESET_TOKEN, FRONTEND_URL_UNDEFINED; remove RESET_CODE_SENT, RESET_CODE_VERIFIED, INVALID_RESET_CODE; delete src/constants.ts and update its importers"
    status: completed
  - id: email-template
    content: "Rewrite email-template.ts reset functions to take { resetUrl, expiresInMinutes }: CTA button + plaintext fallback URL, subject no longer leaks the code"
    status: completed
  - id: auth-service
    content: "Update authentication.service.ts: generate 32-byte base64url token, sha256 to hash, build URL with APP_CONFIG.frontendUrl, drive expiry from PASSWORD_RESET_EXPIRES_MINUTES, drop verifyResetCode, rewrite resetPassword to take (token, newPassword), rename sendResetCodeEmail to sendResetLinkEmail"
    status: completed
  - id: auth-repo
    content: "Update authentication.repository.ts: rename reset_code references to token_hash in SQL; change findValidResetToken signature to (tokenHash) returning { id, user_id }"
    status: completed
  - id: auth-controller
    content: "Update authentication.controller.ts: add Zod schemas for the request and reset bodies; remove verifyResetCode handler; resetPassword reads { token, newPassword }"
    status: completed
  - id: auth-routes
    content: "Update authentication.routes.ts: drop /reset-password/verify-code; rename /reset-password/send-code to /reset-password/request; keep /reset-password/reset"
    status: completed
  - id: fe-endpoints
    content: Add forgotPasswordEndpoint and resetPasswordEndpoint to healty-paws-frontend/src/api/endpoint.ts
    status: completed
  - id: fe-reset-page
    content: "Rewrite ResetPasswordPage.tsx to branch on ?token= search param: no token -> email form posting forgotPasswordEndpoint; token -> new-password form posting resetPasswordEndpoint with { token, newPassword }; remove the entire code step"
    status: completed
isProject: false
---

# Fix F-29: Reset email delivers a code instead of a one-click link

## The problem

The current reset flow makes the user do work that shouldn't exist:

```30:43:healthy-paws-service/src/features/authentication/authentication.routes.ts
router.post("/reset-password/send-code", sendCodeLimiter, authenticationController.startPasswordReset);
router.post("/reset-password/verify-code", resetLimiter, authenticationController.verifyResetCode);
router.post("/reset-password/reset", resetLimiter, authenticationController.resetPassword);
```

Concretely:

- **Manual typing.** The email contains a 6-digit code that the user has to copy from one app (email client) to another (the reset page) by hand.
- **Low entropy.** ~20 bits per code. Even with rate limiting, the verify-code endpoint is a brute-force amplifier: an attacker who steals a session can probe `(email, code)` pairs for free entropy.
- **Pointless verify step.** Both `/verify-code` and `/reset` revalidate the same `(email, code)` pair. The verify step adds attack surface without strengthening security — there's no reason to ask the server "is this code valid?" *before* using it.
- **Three pages of UI** for a flow that should be two: request, then reset.
- **Hardcoded expiry drifts from the email copy.** `expiresAt = Date.now() + 15 * 60 * 1000` in [`authentication.service.ts`](healthy-paws-service/src/features/authentication/authentication.service.ts) ignores `PASSWORD_RESET_EXPIRES_MINUTES`, while the email template uses the env value. Set the env to `30` and users get a 30-minute message but a 15-minute token.
- **Duplicate `SuccessMessages` enum.** [`src/constants.ts`](healthy-paws-service/src/constants.ts) and [`src/errors/constants.ts`](healthy-paws-service/src/errors/constants.ts) define `SuccessMessages` with different wordings; the controller imports from the leaky one ("Reset code sent to your email." — implicit enumeration).

## The new flow

```mermaid
sequenceDiagram
  participant User
  participant FE as Frontend (/auth/reset-password)
  participant API as Backend
  participant DB
  participant Mail as Mail provider

  Note over User,FE: Step 1 - request
  User->>FE: enters email
  FE->>API: POST /api/auth/reset-password/request { email }
  API->>API: random 32B token, sha256 hex
  API->>DB: insert (user_id, token_hash, expires_at)
  API->>Mail: send link FRONTEND_URL/auth/reset-password?token=...
  API-->>FE: 200 (always; privacy preserving)

  Note over User,Mail: Step 2 - click
  User->>Mail: opens email
  User->>FE: clicks link with ?token=...
  FE->>FE: render new-password form

  Note over User,FE: Step 3 - confirm
  User->>FE: types new password
  FE->>API: POST /api/auth/reset-password/reset { token, newPassword }
  API->>API: sha256(token), lookup row
  API->>DB: update Users.password_hash, mark token used
  API-->>FE: 200 success
```

Two HTTP calls instead of three; user types one thing (the new password) instead of three (email, code, password).

## Backend changes

### [`healthy-paws-service/database.sql`](healthy-paws-service/database.sql)

Rename for clarity. The column already holds a SHA-256 hex (64 chars), so the width stays.

```sql
CREATE TABLE PasswordResetTokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_token_hash ON PasswordResetTokens(token_hash);
```

Migration for existing DBs (one-time, outside repo):

```sql
ALTER TABLE PasswordResetTokens RENAME COLUMN reset_code TO token_hash;
DROP INDEX idx_reset_code_user;
CREATE INDEX idx_token_hash ON PasswordResetTokens(token_hash);
```

The new index keys on `token_hash` alone — tokens are globally unique, so the lookup no longer needs `user_id`.

### New: [`healthy-paws-service/src/core/config/app.ts`](healthy-paws-service/src/core/config/app.ts)

Houses `FRONTEND_URL` (and any future app-level URLs). Matches the boot-time validation pattern from F-28's `core/config/jwt.ts`.

```ts
import { SystemError } from "../../errors/SystemError";
import { SystemErrorMessages } from "../../errors/constants";

const fromEnv = process.env.FRONTEND_URL?.trim();
const devDefault =
  process.env.NODE_ENV !== "production" ? "http://localhost:5173" : undefined;
const url = fromEnv || devDefault;
if (!url) {
  throw new SystemError(SystemErrorMessages.FRONTEND_URL_UNDEFINED);
}

export const APP_CONFIG = Object.freeze({
  frontendUrl: url.replace(/\/$/, ""),
});
```

Add `FRONTEND_URL_UNDEFINED` to `SystemErrorMessages`.

### [`healthy-paws-service/src/email-template.ts`](healthy-paws-service/src/email-template.ts)

Swap `{ code }` for `{ resetUrl, expiresInMinutes }`. Subject loses the code leak. HTML has a CTA button plus a plaintext fallback URL for clients that don't render the button.

```ts
export interface ResetEmailTemplateParams {
  resetUrl: string;
  expiresInMinutes: number;
}

export const getResetEmailSubject = (): string =>
  `Reset your ${APP_NAME} password`;

export const getResetEmailText = ({ resetUrl, expiresInMinutes }: ResetEmailTemplateParams) =>
  `Click the link below to reset your password. It expires in ${expiresInMinutes} minutes.\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`;

export const getResetEmailHtml = ({ resetUrl, expiresInMinutes }: ResetEmailTemplateParams) => `
  <!-- header + CTA button linking to resetUrl + expiry note + plaintext fallback URL -->
`;
```

### [`healthy-paws-service/src/features/authentication/authentication.service.ts`](healthy-paws-service/src/features/authentication/authentication.service.ts)

`startPasswordReset` mints a high-entropy token, builds the URL, emails the link. Expiry is sourced from `PASSWORD_RESET_EXPIRES_MINUTES`, not hardcoded. `verifyResetCode` and `sendResetCodeEmail` go away; `resetPassword` takes `(token, newPassword)` — no email parameter.

```ts
import { APP_CONFIG } from "../../core/config/app";
import { PASSWORD_RESET_EXPIRES_MINUTES, APP_NAME } from "../../core/config/email";

public async startPasswordReset(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await this.authenticationRepository.findUserByEmail(normalizedEmail);
  if (!user) return; // silent — privacy preserving

  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRES_MINUTES * 60 * 1000);

  await this.authenticationRepository.invalidatePreviousTokens(user.id);
  await this.authenticationRepository.createResetToken(user.id, tokenHash, expiresAt);

  const resetUrl = `${APP_CONFIG.frontendUrl}/auth/reset-password?token=${rawToken}`;
  await this.sendResetLinkEmail(normalizedEmail, resetUrl);
}

public async resetPassword(token: string, newPassword: string): Promise<void> {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const row = await this.authenticationRepository.findValidResetToken(tokenHash);
  if (!row) {
    throw new ClientError(ClientErrorMessages.INVALID_RESET_TOKEN, 400);
  }
  const hashedPassword = await hashPassword(newPassword);
  try {
    await this.authenticationRepository.updateUserPassword(row.user_id, hashedPassword);
    await this.authenticationRepository.markResetTokenUsed(row.id);
  } catch (err) {
    throw new SystemError(SystemErrorMessages.DB_TRANSACTION_FAILED, err);
  }
}

private async sendResetLinkEmail(toEmail: string, resetUrl: string): Promise<void> {
  // nodemailer wiring stays — only template params change
  const templateParams = {
    resetUrl,
    expiresInMinutes: PASSWORD_RESET_EXPIRES_MINUTES,
  };
  // ...
}
```

`verifyResetCode` is deleted in full.

### [`healthy-paws-service/src/features/authentication/authentication.repository.ts`](healthy-paws-service/src/features/authentication/authentication.repository.ts)

Methods rename to match the new column name; `findValidResetToken` no longer needs `userId`.

```ts
public async createResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
  await this.db.query(
    `INSERT INTO PasswordResetTokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );
}

public async findValidResetToken(tokenHash: string): Promise<{ id: string; user_id: string } | null> {
  const r = await this.db.query(
    `SELECT id, user_id FROM PasswordResetTokens
     WHERE token_hash = $1 AND used = false AND expires_at > now()`,
    [tokenHash]
  );
  return r.rows[0] ?? null;
}
```

`invalidatePreviousTokens`, `markResetTokenUsed`, `updateUserPassword` keep their signatures (no column references to update).

### [`healthy-paws-service/src/features/authentication/authentication.controller.ts`](healthy-paws-service/src/features/authentication/authentication.controller.ts)

Drop `verifyResetCode`. `resetPassword` now reads `{ token, newPassword }`. Add Zod for both bodies, matching the F-8 pattern.

```ts
const requestResetSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({ token: z.string().min(1), newPassword: passwordSchema });

public resetPassword = async (req, res, next) => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ClientError(ClientErrorMessages.NEW_PASSWORD_REQUIRED, 400);
  }
  await this.service.resetPassword(parsed.data.token, parsed.data.newPassword);
  // ...
};
```

`passwordSchema` is reused from registration (same complexity rules from F-14).

### [`healthy-paws-service/src/features/authentication/authentication.routes.ts`](healthy-paws-service/src/features/authentication/authentication.routes.ts)

Drop the verify route; rename send-code for clarity.

```ts
router.post("/reset-password/request", sendCodeLimiter, authenticationController.startPasswordReset);
router.post("/reset-password/reset",   resetLimiter,    authenticationController.resetPassword);
```

Rate limiters stay attached — same risk profile, just different names.

### Constants consolidation — [`healthy-paws-service/src/errors/constants.ts`](healthy-paws-service/src/errors/constants.ts) is the canonical home

```ts
export enum ClientErrorMessages {
  // ...
  INVALID_RESET_TOKEN = "Invalid or expired reset link.",
  // INVALID_RESET_CODE removed
}

export enum SuccessMessages {
  LOGIN_SUCCESS = "Logged in successfully.",
  RESET_LINK_SENT = "If this email is registered, you will receive a password reset link.",
  PASSWORD_RESET_SUCCESS = "Password reset successfully.",
  // RESET_CODE_SENT and RESET_CODE_VERIFIED removed
}

export enum SystemErrorMessages {
  // ...
  FRONTEND_URL_UNDEFINED = "CRITICAL: FRONTEND_URL is not defined in production environment.",
}
```

[`src/constants.ts`](healthy-paws-service/src/constants.ts) is deleted; everything is imported from `errors/constants.ts` (single source of truth — matches what the codebase clearly intended).

## Frontend changes

### [`healty-paws-frontend/src/api/endpoint.ts`](healty-paws-frontend/src/api/endpoint.ts)

Replace the ad-hoc inline strings with named constants.

```ts
export const forgotPasswordEndpoint = "/api/auth/reset-password/request";
export const resetPasswordEndpoint  = "/api/auth/reset-password/reset";
```

### [`healty-paws-frontend/src/pages/auth/register/ResetPasswordPage.tsx`](healty-paws-frontend/src/pages/auth/register/ResetPasswordPage.tsx)

Single page, branches on the query string:

```tsx
const [searchParams] = useSearchParams();
const token = searchParams.get("token");

if (!token) {
  // Step 1: email form -> POST forgotPasswordEndpoint -> "Check your email" screen
}

// Step 2: new-password form -> POST resetPasswordEndpoint { token, newPassword }
//   -> success screen with "Back to login" CTA
//   -> 400 INVALID_RESET_TOKEN -> show "link expired" with a button to request a new one
```

The whole "code" step (state value `"code"`, the 6-digit input, the verify call) is deleted. The `minLength={6}` / message-says-8 inconsistency disappears because the input simply moves to the password complexity rules from F-14.

### `App.tsx`, `utils/path.ts`

No changes. `authResetPasswordPath = "/auth/reset-password"` stays — the new flow just reads `?token=`.

## What stays untouched

- bcrypt hashing of the new password (F-14 cost factor 12).
- Rate limiters on both routes — same protection, route names just changed.
- `PasswordResetTokens.used` flag and `expires_at`, ON DELETE CASCADE.
- Privacy-preserving silent success when the email is unknown (F-3).
- The login page's "Forgot password?" link — still points at `authResetPasswordPath`.
- Nodemailer transport config.

## Verification after change

- Request a reset for a known email: receive an email with a button labeled "Reset Password" linking to `${FRONTEND_URL}/auth/reset-password?token=...`. The token is ~43 chars of base64url. The DB row holds the 64-char hex of `sha256(token)` with `expires_at = now + PASSWORD_RESET_EXPIRES_MINUTES * 60s`.
- Request a reset for an unknown email: same generic response, no email sent, no DB row created.
- Click the link: lands on the new-password form. Submit → password updated; row marked `used = true`.
- Click the same link a second time: 400 `INVALID_RESET_TOKEN`.
- Wait past expiry, then click: 400 `INVALID_RESET_TOKEN`.
- POST `/reset-password/verify-code`: 404 (route doesn't exist anymore).
- Boot with `NODE_ENV=production` and no `FRONTEND_URL`: server throws `FRONTEND_URL_UNDEFINED` at module load, before HTTP listener binds.
- Boot in dev: `FRONTEND_URL` defaults to `http://localhost:5173`.
- Two concurrent reset requests for the same user: the second invalidates the first (existing `invalidatePreviousTokens` behavior, unchanged).
- Lint pass on all touched files.

## Files changed

Backend:
- [`healthy-paws-service/database.sql`](healthy-paws-service/database.sql) — column + index rename.
- [`healthy-paws-service/src/core/config/app.ts`](healthy-paws-service/src/core/config/app.ts) — new, exports frozen `APP_CONFIG.frontendUrl`.
- [`healthy-paws-service/src/email-template.ts`](healthy-paws-service/src/email-template.ts) — link-based template; subject no longer leaks anything.
- [`healthy-paws-service/src/features/authentication/authentication.service.ts`](healthy-paws-service/src/features/authentication/authentication.service.ts) — token mint, env-driven expiry, `resetPassword(token, newPassword)`, `verifyResetCode` removed, `sendResetLinkEmail` replaces `sendResetCodeEmail`.
- [`healthy-paws-service/src/features/authentication/authentication.repository.ts`](healthy-paws-service/src/features/authentication/authentication.repository.ts) — column rename in SQL, `findValidResetToken` signature change.
- [`healthy-paws-service/src/features/authentication/authentication.controller.ts`](healthy-paws-service/src/features/authentication/authentication.controller.ts) — Zod schemas, `verifyResetCode` removed, new reset body shape.
- [`healthy-paws-service/src/features/authentication/authentication.routes.ts`](healthy-paws-service/src/features/authentication/authentication.routes.ts) — drop verify route, rename send-code to request.
- [`healthy-paws-service/src/errors/constants.ts`](healthy-paws-service/src/errors/constants.ts) — `RESET_CODE_SENT` → `RESET_LINK_SENT`, `INVALID_RESET_CODE` → `INVALID_RESET_TOKEN`, drop `RESET_CODE_VERIFIED`, add `FRONTEND_URL_UNDEFINED`.
- [`healthy-paws-service/src/constants.ts`](healthy-paws-service/src/constants.ts) — deleted (duplicate enum consolidated into `errors/constants.ts`).

Frontend:
- [`healty-paws-frontend/src/api/endpoint.ts`](healty-paws-frontend/src/api/endpoint.ts) — add `forgotPasswordEndpoint` and `resetPasswordEndpoint`.
- [`healty-paws-frontend/src/pages/auth/register/ResetPasswordPage.tsx`](healty-paws-frontend/src/pages/auth/register/ResetPasswordPage.tsx) — single page branching on `?token=`, code step removed.
