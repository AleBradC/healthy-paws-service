---
name: Fix F-14 Password Policy
overview: Raise bcrypt cost from 10 to 12, enforce a meaningful password complexity rule on the backend (Zod), and align both frontend registration and password-reset pages to match the backend minimum (8 chars).
todos:
  - id: bcrypt-cost
    content: Raise bcrypt saltRounds from 10 to 12 in helpers.ts and DUMMY_HASH in authentication.service.ts
    status: completed
  - id: backend-password-policy
    content: Add complexity regex (uppercase + lowercase + digit + special char) to Zod passwordSchema in registration.validation.ts
    status: completed
  - id: frontend-align
    content: Align all frontend password minimums from 6 to 8 in RegisterOwnerPage, RegisterDoctorPage, and ResetPasswordPage
    status: completed
isProject: false
---

# Fix F-14: Weak password policy & bcrypt cost 10

## The two problems

### 1. bcrypt cost factor too low (cost 10)

[`helpers.ts`](healthy-paws-service/src/helpers.ts) defaults to `saltRounds = 10`, and [`authentication.service.ts`](healthy-paws-service/src/features/authentication/authentication.service.ts) hard-codes cost 10 for the dummy hash:

```ts
// helpers.ts
export const hashPassword = async (password: string, saltRounds = 10)

// authentication.service.ts
const DUMMY_HASH = bcrypt.hashSync("__dummy__", 10);
```

OWASP recommends bcrypt cost **12** (≈250 ms/hash). Cost 10 (~65 ms) is too fast for modern hardware, making offline brute-force significantly cheaper.

### 2. Password policy: minimum 8 chars only, no complexity rule

**Backend** — [`registration.validation.ts`](healthy-paws-service/src/features/registration/registration.validation.ts) accepts any 8-character string:

```ts
password: z.string().min(8, "Password must be at least 8 characters"),
```

No uppercase, lowercase, digit, or special-character requirement.

**Frontend — mismatched threshold** (6 chars, not 8):

- [`RegisterOwnerPage.tsx`](healty-paws-frontend/src/pages/auth/register/RegisterOwnerPage.tsx): `password.length >= 6`, error message "must be at least 6 characters"
- [`RegisterDoctorPage.tsx`](healty-paws-frontend/src/pages/auth/register/RegisterDoctorPage.tsx): `password.length >= 6`
- [`ResetPasswordPage.tsx`](healty-paws-frontend/src/pages/auth/register/ResetPasswordPage.tsx): `canResetPassword = newPassword.length >= 6`, error "must be at least 6 characters"

The frontend allows a 6-character password through to the backend, which then rejects it — a confusing UX gap and an inconsistency that could mask bypasses.

## The fix

### A. Raise bcrypt cost to 12

**[`helpers.ts`](healthy-paws-service/src/helpers.ts)** — change the default:

```ts
export const hashPassword = async (password: string, saltRounds = 12): Promise<string> => {
  return await bcrypt.hash(password, saltRounds);
};
```

**[`authentication.service.ts`](healthy-paws-service/src/features/authentication/authentication.service.ts)** — match the dummy hash:

```ts
const DUMMY_HASH = bcrypt.hashSync("__dummy__", 12);
```

### B. Add a complexity rule to the backend Zod schema

**[`registration.validation.ts`](healthy-paws-service/src/features/registration/registration.validation.ts)** — shared regex, applied to both `ownerSchema` and `doctorSchema`:

```ts
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/,
    "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
  );
```

Replace the inline `z.string().min(8, ...)` in both schemas with `passwordSchema`.

### C. Align frontend validation to match the backend

**[`RegisterOwnerPage.tsx`](healty-paws-frontend/src/pages/auth/register/RegisterOwnerPage.tsx)**:
- `canProceedStep1`: change `>= 6` → `>= 8`
- `validateStep1`: change `< 6` → `< 8` and update the message to "at least 8 characters"

**[`RegisterDoctorPage.tsx`](healty-paws-frontend/src/pages/auth/register/RegisterDoctorPage.tsx)**:
- `canProceedStep1`: change `>= 6` → `>= 8`

**[`ResetPasswordPage.tsx`](healty-paws-frontend/src/pages/auth/register/ResetPasswordPage.tsx)**:
- `canResetPassword`: change `>= 6` → `>= 8`
- Validation error message: "at least 6" → "at least 8"
- The hint text "Password must be at least 6 characters" → "at least 8 characters"

## Files changed

- [`healthy-paws-service/src/helpers.ts`](healthy-paws-service/src/helpers.ts) — raise default `saltRounds` to 12
- [`healthy-paws-service/src/features/authentication/authentication.service.ts`](healthy-paws-service/src/features/authentication/authentication.service.ts) — raise `DUMMY_HASH` cost to 12
- [`healthy-paws-service/src/features/registration/registration.validation.ts`](healthy-paws-service/src/features/registration/registration.validation.ts) — add complexity regex via shared `passwordSchema`
- [`healty-paws-frontend/src/pages/auth/register/RegisterOwnerPage.tsx`](healty-paws-frontend/src/pages/auth/register/RegisterOwnerPage.tsx) — align minimum to 8
- [`healty-paws-frontend/src/pages/auth/register/RegisterDoctorPage.tsx`](healty-paws-frontend/src/pages/auth/register/RegisterDoctorPage.tsx) — align minimum to 8
- [`healty-paws-frontend/src/pages/auth/register/ResetPasswordPage.tsx`](healty-paws-frontend/src/pages/auth/register/ResetPasswordPage.tsx) — align minimum and hint text to 8
