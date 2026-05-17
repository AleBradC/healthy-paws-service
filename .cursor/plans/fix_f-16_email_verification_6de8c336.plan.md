---
name: Fix F-16 Email Verification
overview: Add a mandatory email verification step between registration and first login. A 6-digit OTP is sent via email after registration; the backend blocks login until the address is verified. The frontend gains a new VerifyEmailPage inserted between the registration form and the success page.
todos:
  - id: db-schema
    content: Add email_verified column to Users and EmailVerificationTokens table to database.sql
    status: completed
  - id: types-errors
    content: Add email_verified to UserRecord in types.ts and EMAIL_NOT_VERIFIED / EMAIL_VERIFIED constants
    status: completed
  - id: email-template
    content: Add EMAIL_VERIFICATION_EXPIRES_MINUTES to email.ts config and getVerifyEmail* template functions to email-template.ts
    status: completed
  - id: registration-backend
    content: Add createEmailVerificationToken to registration.repository.ts and send verification email after user creation in registration.service.ts
    status: completed
  - id: auth-backend
    content: Add findValidVerificationToken and markEmailVerified to authentication.repository.ts; block unverified login and add verifyEmail() to authentication.service.ts; add verifyEmail handler to controller and POST /verify-email route
    status: completed
  - id: frontend-changes
    content: Add verifyEmailEndpoint and authVerifyEmailPath; create VerifyEmailPage.tsx; update RegisterOwnerPage and RegisterDoctorPage redirects; update RegistrationSuccessPage copy; register route in App.tsx
    status: completed
isProject: false
---

# Fix F-16: No email verification before login

## The problem

After registering, any user can immediately log in — even with a fake or someone else's email address. The `Users` table has no `email_verified` column, and `validateUser` performs no verification check.

## The fix

The same 6-digit SHA-256-hashed OTP pattern used by password reset is reused, keeping implementation consistent and lean.

### New registration flow

```
Register → email sent with 6-digit code → VerifyEmailPage (enter code)
         → RegistrationSuccessPage → Login
```

Login is blocked with `403` if `email_verified = false`.

---

## Backend changes

### [`database.sql`](healthy-paws-service/database.sql)

Add `email_verified` column to `Users`:
```sql
ALTER TABLE Users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;
```

Add `EmailVerificationTokens` table (mirrors `PasswordResetTokens`):
```sql
CREATE TABLE EmailVerificationTokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
  code_hash  VARCHAR(64) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT FALSE
);
```

### [`types.ts`](healthy-paws-service/src/types.ts)

Add `email_verified` to `UserRecord`:
```ts
export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  password_salt: string;
  role: ROLES;
  email_verified: boolean;
}
```

### [`errors/constants.ts`](healthy-paws-service/src/errors/constants.ts)

```ts
// ClientErrorMessages
EMAIL_NOT_VERIFIED = "Please verify your email address before logging in.",

// SuccessMessages
EMAIL_VERIFIED = "Email verified successfully.",
```

### [`core/config/email.ts`](healthy-paws-service/src/core/config/email.ts)

Add expiry constant for verification tokens:
```ts
export const EMAIL_VERIFICATION_EXPIRES_MINUTES = Number(
  process.env.EMAIL_VERIFICATION_EXPIRES_MINUTES ?? 30
);
```

### [`email-template.ts`](healthy-paws-service/src/email-template.ts)

Add template functions `getVerifyEmailSubject`, `getVerifyEmailText`, `getVerifyEmailHtml` that look like the existing reset templates but with "Verify your email" copy.

### [`registration.repository.ts`](healthy-paws-service/src/features/registration/registration.repository.ts)

Add one method:
```ts
public async createEmailVerificationToken(
  userId: string, codeHash: string, expiresAt: Date
): Promise<void>
```
Inserts into `EmailVerificationTokens`.

### [`registration.service.ts`](healthy-paws-service/src/features/registration/registration.service.ts)

After both `createOwnerAndPet` and `createDoctorWithDetails` succeed, generate a 6-digit code, SHA-256 hash it, persist it, then send the verification email. The raw code goes only into the email.

### [`authentication.repository.ts`](healthy-paws-service/src/features/authentication/authentication.repository.ts)

Add two methods:
```ts
public async findValidVerificationToken(userId: string, codeHash: string): Promise<{ id: string } | null>
public async markEmailVerified(userId: string, tokenId: string): Promise<void>
// marks token used=true and sets Users.email_verified=true in a single transaction
```

### [`authentication.service.ts`](healthy-paws-service/src/features/authentication/authentication.service.ts)

In `validateUser` — after password match is confirmed, check `user.email_verified`:
```ts
if (user && isMatch) {
  if (!user.email_verified) {
    throw new ClientError(ClientErrorMessages.EMAIL_NOT_VERIFIED, 403);
  }
  return { id: user.id, email: user.email, role: user.role };
}
```

Add new `verifyEmail(email, code)` service method that looks up the user, hashes the code, finds a valid token, marks it used and marks the user verified.

### [`authentication.controller.ts`](healthy-paws-service/src/features/authentication/authentication.controller.ts)

Add `verifyEmail` handler — reads `{ email, code }` from body, calls service, returns `200` with `EMAIL_VERIFIED` message.

### [`authentication.routes.ts`](healthy-paws-service/src/features/authentication/authentication.routes.ts)

```ts
router.post("/verify-email", resetLimiter, authenticationController.verifyEmail);
```

---

## Frontend changes

### [`api/endpoint.ts`](healty-paws-frontend/src/api/endpoint.ts)

```ts
export const verifyEmailEndpoint = "/api/auth/verify-email";
```

### [`utils/path.ts`](healty-paws-frontend/src/utils/path.ts)

```ts
export const authVerifyEmailPath = "/auth/verify-email";
```

### New file: [`VerifyEmailPage.tsx`](healty-paws-frontend/src/pages/auth/register/VerifyEmailPage.tsx)

Styled identically to the `"code"` step in `ResetPasswordPage.tsx`. Receives the email via React Router `location.state.email`. On successful `POST /api/auth/verify-email`, navigates to `successPagePath`.

### [`RegisterOwnerPage.tsx`](healty-paws-frontend/src/pages/auth/register/RegisterOwnerPage.tsx)

Change post-registration redirect:
```ts
// before
navigate(successPagePath);
// after
navigate(authVerifyEmailPath, { state: { email: ownerData.email } });
```

### [`RegisterDoctorPage.tsx`](healty-paws-frontend/src/pages/auth/register/RegisterDoctorPage.tsx)

Same redirect change using `formData.email`.

### [`RegistrationSuccessPage.tsx`](healty-paws-frontend/src/pages/auth/register/RegistrationSuccessPage.tsx)

Update copy to reflect that the account is now fully active:
- Heading: "Email Verified!"
- Body: "Your account is confirmed. You can now log in."

### [`App.tsx`](healty-paws-frontend/src/App.tsx)

Add lazy import and route for `VerifyEmailPage` at `/auth/verify-email`.

---

## Files changed

**Backend (8 files):**
- [`database.sql`](healthy-paws-service/database.sql)
- [`src/types.ts`](healthy-paws-service/src/types.ts)
- [`src/errors/constants.ts`](healthy-paws-service/src/errors/constants.ts)
- [`src/core/config/email.ts`](healthy-paws-service/src/core/config/email.ts)
- [`src/email-template.ts`](healthy-paws-service/src/email-template.ts)
- [`src/features/registration/registration.repository.ts`](healthy-paws-service/src/features/registration/registration.repository.ts)
- [`src/features/registration/registration.service.ts`](healthy-paws-service/src/features/registration/registration.service.ts)
- [`src/features/authentication/authentication.repository.ts`](healthy-paws-service/src/features/authentication/authentication.repository.ts)
- [`src/features/authentication/authentication.service.ts`](healthy-paws-service/src/features/authentication/authentication.service.ts)
- [`src/features/authentication/authentication.controller.ts`](healthy-paws-service/src/features/authentication/authentication.controller.ts)
- [`src/features/authentication/authentication.routes.ts`](healthy-paws-service/src/features/authentication/authentication.routes.ts)

**Frontend (6 files + 1 new):**
- [`src/api/endpoint.ts`](healty-paws-frontend/src/api/endpoint.ts)
- [`src/utils/path.ts`](healty-paws-frontend/src/utils/path.ts)
- `src/pages/auth/register/VerifyEmailPage.tsx` (new)
- [`src/pages/auth/register/RegisterOwnerPage.tsx`](healty-paws-frontend/src/pages/auth/register/RegisterOwnerPage.tsx)
- [`src/pages/auth/register/RegisterDoctorPage.tsx`](healty-paws-frontend/src/pages/auth/register/RegisterDoctorPage.tsx)
- [`src/pages/auth/register/RegistrationSuccessPage.tsx`](healty-paws-frontend/src/pages/auth/register/RegistrationSuccessPage.tsx)
- [`src/App.tsx`](healty-paws-frontend/src/App.tsx)
