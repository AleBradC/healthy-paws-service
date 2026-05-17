---
name: Fix F-2 hash leak
overview: "Prevent password_hash and password_salt from ever reaching context.user or any GraphQL/REST response. The F-1 fix already plugged the JWT strategy path; this plan hardens the remaining surfaces: the GraphQL context type, the findUserById return type, and the SELECT * queries that load the full UserRecord unnecessarily."
todos:
  - id: safe-type
    content: Add SafeUserRecord interface to src/types.ts
    status: completed
  - id: auth-repo
    content: Narrow findUserById in authentication.repository.ts to SELECT id, email, role and return SafeUserRecord
    status: completed
  - id: auth-service
    content: Update findUserById return type in authentication.service.ts and import SafeUserRecord
    status: completed
  - id: reg-repo
    content: Narrow findUserById in registration.repository.ts for consistency
    status: completed
  - id: lint-check
    content: Run lints and verify no remaining SELECT * on findUserById paths
    status: completed
isProject: false
---

# Fix F-2: password_hash / password_salt leak into context.user

## Current state after F-1

The JWT strategy already returns a trimmed object:

```ts
return done(null, { id: user.id, email: user.email, role: