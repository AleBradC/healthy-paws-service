---
name: Fix F-4 timing enumeration
overview: Eliminate the timing side-channel on the login endpoint by always running a bcrypt comparison, even when the email is not found, so both the "unknown email" and "wrong password" paths take the same wall-clock time.
todos:
  - id: dummy-hash
    content: Add DUMMY_HASH module-level constant in authentication.service.ts
    status: completed
  - id: validate-user
    content: Rewrite validateUser to always call bcrypt.compare using hashToCompare pattern
    status: completed
  - id: lint-verify
    content: Run lints on authentication.service.ts and confirm no errors
    status: completed
isProject: false
---

# Fix F-4: Timing-based user enumeration on login

## The problem

In [`authentication.service.ts`](healthy-paws-service/src/features/authentication/authentication.service.ts), `validateUser` returns early when no user is found — sk