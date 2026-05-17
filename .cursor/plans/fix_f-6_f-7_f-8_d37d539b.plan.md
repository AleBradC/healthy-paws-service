---
name: Fix F-6 F-7 F-8
overview: "Fix three related input-handling problems: hash reset codes before DB storage and invalidate old tokens on resend (F-6); normalize emails to lowercase+trimmed at the service layer everywhere (F-7); add Zod schema validation on registration inputs (F-8)."
todos:
  - id: f6-db-schema
    content: Widen reset_code column to VARCHAR(64) in database.sql
    status: completed
  - id: f6-repo
    content: Add invalidatePreviousTokens to authentication.repository.ts
    status: completed
  - id: f6-service
    content: Hash reset codes and call invalidatePreviousTokens in authentication.service.ts (startPasswordReset, verifyResetCode, resetPassword)
    status: completed
  - id: f7-auth
    content: Normalize emails in authentication.service.ts (validateUser, startPasswordReset, verifyResetCode, resetPassword)
    status: completed
  - id: f7-reg
    content: Normalize emails in registration.service.ts (registerOwner, registerDoctor)
    status: completed
  - id: f8-install
    content: Install zod
    status: completed
  - id: f8-schemas
    content: Create registration.validation.ts with ownerSchema, petSchema, doctorSchema
    status: completed
  - id: f8-controller
    content: Apply Zod safeParse in registration.controller.ts
    status: completed
  - id: lint-verify
    content: Run lints on all changed files and confirm no errors
    status: completed
isProject: false
---

# Fix F-6, F-7, F-8: Reset code hashing / Email normalization / Registration validation

## F-6: Reset codes stored plaintext, old tokens not invalidated on resend

### The problems

**Plaintext storage** — `PasswordResetTokens.reset_code VARCHAR(6)` stores the raw 6-digit number. A DB leak exposes all active codes immediately.

**No invalidation on resend** — `startPasswordReset` only inserts a new row; previous tokens for the same user remain valid until they expire. An attacker with an old code can still use it after the user requested a new one.

### The fix

**Hash before storing** using `crypto.createHash('sha256')`. Generate the plaintext code as before, hand it to the email template, store only the hex digest.

```ts
// authentication.service.ts — startPasswordReset
const resetCode = crypto.randomInt(100000, 999999).toString();
const codeHash = crypto.createHash("sha256").update(resetCode).digest("hex");

await this.authenticationRepository.invalidatePreviousTokens(user.id);
await this.authenticationRepository.createResetToken(user.id, codeHash, expiresAt);
await this.sendResetCodeEmail(email, resetCode); // raw code goes only to email
```

**Hash on lookup** in `verifyResetCode` and `resetPassword`:

```ts
const codeHash = crypto.createHash("sha256").update(code).digest("hex");
const token = user
  ? await this.authenticationRepository.findValidResetToken(user.id, codeHash)
  : null;
```

**Invalidate on resend** — new repository method added before insert:

```ts
// authentication.repository.ts
public async invalidatePreviousTokens(userId: string): Promise<void> {
  await this.db.query(
    "DELETE FROM PasswordResetTokens WHERE user_id = $1 AND used = false",
    [userId]
  );
}
```

**DB schema** — widen the column to fit a SHA-256 hex digest (64 chars):

```sql
-- database.sql
reset_code VARCHAR(64) NOT NULL,
```

### Files changed
- [`database.sql`](healthy-paws-service/database.sql) — `VARCHAR(6)` → `VARCHAR(64)`
- [`src/features/authentication/authentication.repository.ts`](healthy-paws-service/src/features/authentication/authentication.repository.ts) — add `invalidatePreviousTokens`
- [`src/features/authentication/authentication.service.ts`](healthy-paws-service/src/features/authentication/authentication.service.ts) — hash code before `createResetToken`; call `invalidatePreviousTokens`; hash code in `verifyResetCode` and `resetPassword` before lookup

---

## F-7: Emails not normalized — both sides

### The problem

PostgreSQL's `=` operator on `VARCHAR` is case-sensitive. `User@Example.com` and `user@example.com` are treated as different rows, bypassing the `UNIQUE` constraint and creating phantom duplicate accounts. This affects:

- [`registration.service.ts`](healthy-paws-service/src/features/registration/registration.service.ts) — `findUserByEmail` and the INSERT both use the raw payload email
- [`authentication.service.ts`](healthy-paws-service/src/features/authentication/authentication.service.ts) — `validateUser`, `startPasswordReset`, `verifyResetCode`, `resetPassword` all pass the raw request email to `findUserByEmail`

### The fix

Normalize at the service layer — `.trim().toLowerCase()` — before any DB call:

```ts
// registration.service.ts — registerOwner
const normalizedEmail = payload.owner.email.trim().toLowerCase();
const existingUser = await this.registrationRepository.findUserByEmail(normalizedEmail);
// ... pass normalizedEmail to createOwnerAndPet instead of payload.owner.email
```

```ts
// authentication.service.ts — validateUser (and all reset methods)
const normalizedEmail = email.trim().toLowerCase();
const user = await this.authenticationRepository.findUserByEmail(normalizedEmail);
```

Since emails are always stored normalized, the existing DB `UNIQUE` constraint on `email` naturally prevents case-variant duplicates without any schema change.

### Files changed
- [`src/features/registration/registration.service.ts`](healthy-paws-service/src/features/registration/registration.service.ts) — normalize in `registerOwner` and `registerDoctor`
- [`src/features/authentication/authentication.service.ts`](healthy-paws-service/src/features/authentication/authentication.service.ts) — normalize in `validateUser`, `startPasswordReset`, `verifyResetCode`, `resetPassword`

---

## F-8: No server-side input validation on registration

### The problem

[`registration.controller.ts`](healthy-paws-service/src/features/registration/registration.controller.ts) only checks if the `owner`/`pet`/`doctor` keys are present — no field-level validation. Any string (or empty string) is accepted for email, password, name, pet age/weight, etc. An attacker can submit garbage data that reaches the DB or triggers confusing errors.

### The fix

Install `zod` and validate the full payload before touching the service:

```bash
npm install zod
```

New file [`src/features/registration/registration.validation.ts`](healthy-paws-service/src/features/registration/registration.validation.ts):

```ts
import { z } from "zod";

export const ownerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const petSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  breed: z.string().min(1),
  age: z.number().int().positive(),
  weight: z.number().positive(),
});

export const doctorSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string(),
  clinicName: z.string().min(1),
  clinicAddress: z.string().min(1),
  specializations: z.array(z.object({
    name: z.string().min(1),
    services: z.array(z.object({
      name: z.string().min(1),
      price: z.number().positive(),
    })),
  })),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
```

In [`registration.controller.ts`](healthy-paws-service/src/features/registration/registration.controller.ts), parse before dispatching:

```ts
if (role === ROLES.OWNER_ROLE) {
  const ownerResult = ownerSchema.safeParse(owner);
  const petResult = petSchema.safeParse(pet);
  if (!ownerResult.success || !petResult.success) {
    throw new ClientError(
      ownerResult.error?.issues[0]?.message ?? petResult.error?.issues[0]?.message ?? "Invalid input",
      400
    );
  }
  // ... rest unchanged
}
```

### Files changed
- [`src/features/registration/registration.validation.ts`](healthy-paws-service/src/features/registration/registration.validation.ts) — new file, Zod schemas
- [`src/features/registration/registration.controller.ts`](healthy-paws-service/src/features/registration/registration.controller.ts) — call `safeParse` before dispatching to service
- `package.json` — `zod` added as dependency

---

## All files changed (combined)

- [`database.sql`](healthy-paws-service/database.sql)
- [`src/features/authentication/authentication.repository.ts`](healthy-paws-service/src/features/authentication/authentication.repository.ts)
- [`src/features/authentication/authentication.service.ts`](healthy-paws-service/src/features/authentication/authentication.service.ts)
- [`src/features/registration/registration.service.ts`](healthy-paws-service/src/features/registration/registration.service.ts)
- [`src/features/registration/registration.validation.ts`](healthy-paws-service/src/features/registration/registration.validation.ts) — new
- [`src/features/registration/registration.controller.ts`](healthy-paws-service/src/features/registration/registration.controller.ts)