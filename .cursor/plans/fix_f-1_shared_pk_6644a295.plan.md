---
name: Fix F-1 shared PK
overview: Eliminate the JWT subject mismatch (F-1) at the schema level by making `Owners.id` and `Doctors.id` share `Users.id` as the primary key. One id covers authentication, account lookup, and ownership checks; the JWT only carries that single id. This also resolves F-10 (dual-id model) and F-33 (dead lookup helpers). Frontend is untouched because it never queries `user_id` on Owner/Doctor.
todos:
  - id: schema
    content: "Update database.sql: Owners and Doctors use Users.id as PK; drop user_id columns"
    status: completed
  - id: types
    content: Drop user_id from Owner and Doctor TS interfaces in src/types.ts
    status: completed
  - id: registration
    content: Update registration.repository.ts to insert Owners/Doctors with id = Users.id and use that id as Pets.owner_id
    status: completed
  - id: controller
    content: Simplify authentication.controller.ts login (remove profile-id lookup block, sign JWT with user.id)
    status: completed
  - id: jwt_strategy
    content: Simplify passport-config.ts JWT strategy and return a trimmed identity object
    status: completed
  - id: dead_helpers
    content: Remove findOwnerIdByUserId/findDoctorIdByUserId from auth service and repository
    status: completed
  - id: owners
    content: Fix owners.repository.ts (drop user_id from SELECT/RETURNING) and owners.resolvers.ts email resolver
    status: completed
  - id: doctors
    content: Fix doctors.repository.ts param names and doctors.resolvers.ts email resolver
    status: completed
  - id: pets
    content: Fix pets.loaders.ts and pets.repository.ts (drop o.user_id from JOIN SELECTs)
    status: completed
  - id: verify
    content: Run lints, grep for leftover user_id references, sanity-check the test file
    status: completed
isProject: false
---

# Fix F-1: JWT subject mismatch via shared `Users.id` primary key

## Why this works

Today the JWT carries the **profile id** (`Owners.id` / `Doctors.id`), but the JWT strategy validates that value against the `Users` table — they're unrelated UUIDs, so authentication silently fails for every protected GraphQL call. If we make the schema enforce `Owners.id = Doctors.id = Users.id` (1:1 shared PK), one id serves all three jobs:

```mermaid
flowchart LR
  Login["POST /api/auth/login"] -->|"jwt.sign({ id: Users.id })"| Token
  Token -->|"Authorization: Bearer ..."| JwtStrategy
  JwtStrategy -->|"findUserById(jwt.id)"| Users
  Users -->|"req.user.id = Users.id = Owners.id = Doctors.id"| Resolvers
  Resolvers -->|"owner_id / doctor_id checks"| Postgres
```

The class of bugs we're fixing becomes structurally impossible.

## Frontend impact

None. The frontend never selects `Owner.user_id` or `Doctor.user_id` (verified in [healty-paws-frontend/src/lib/graphql/operations.graphql](healty-paws-frontend/src/lib/graphql/operations.graphql)). It uses `jwtDecode(token).id` and passes it straight into `owner(id:)` / `doctor(id:)`, which works identically before and after the change.

## Operational note (read first)

This is a destructive schema change. Existing data in any running dev DB has `Owners.id != Users.id`, so the new FK will reject those rows.

Two options:
- **Wipe & recreate** (matches the README workflow): `dropdb <db> && createdb <db> && psql -d <db> -f database.sql`.
- **One-off backfill** before applying the new schema: `UPDATE Pets p SET owner_id = o.user_id FROM Owners o WHERE p.owner_id = o.id;` (and analogous updates for `Availabilities`, `Appointments`, `Doctor_Specializations`, `Doctor_Service_Pricing`), then `UPDATE Owners SET id = user_id; UPDATE Doctors SET id = user_id;` — all inside a transaction. I can produce that migration script as a follow-up if you want to preserve existing data.

Pre-existing JWTs are invalidated by this change (their `id` won't match any `Users.id`). Users must log in again. Same caveat as the previous attempt.

## Files & changes

### 1. Schema — [database.sql](healthy-paws-service/database.sql)

`Owners.id` and `Doctors.id` become a shared PK with `Users.id`:

```sql
CREATE TABLE Owners (
    id UUID PRIMARY KEY REFERENCES Users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE Doctors (
    id UUID PRIMARY KEY REFERENCES Users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    clinic_name VARCHAR(255),
    clinic_address VARCHAR(255)
);
```

Drop the `user_id` columns.

### 2. Types — [src/types.ts](healthy-paws-service/src/types.ts)

- `JwtPayload` stays `{ id, email, role }` (already correct; no change needed beyond documentation comment).
- Remove `user_id: string;` from `Owner` and `Doctor` interfaces.

### 3. Registration — [src/features/registration/registration.repository.ts](healthy-paws-service/src/features/registration/registration.repository.ts)

Insert the profile row with `id = Users.id`:

```sql
INSERT INTO Owners (id, name) VALUES ($1, $2)   -- $1 = newUser.id
INSERT INTO Doctors (id, name, clinic_name, clinic_address) VALUES ($1, $2, $3, $4)
```

Pets use the same id as `owner_id`.

### 4. Login controller — [src/features/authentication/authentication.controller.ts](healthy-paws-service/src/features/authentication/authentication.controller.ts)

Delete the entire profile-id lookup block (lines 39-63) and the role-specific branching. The JWT payload becomes:

```ts
const payload: JwtPayload = {
  id: user.id,
  email: user.email,
  role: user.role,
};
```

Login response `id` is `user.id` (same as profile id). Remove unused `ROLES` import and `OWNER_PROFILE_NOT_FOUND` / `DOCTOR_PROFILE_NOT_FOUND` references.

### 5. JWT strategy — [src/core/middleware/passport-config.ts](healthy-paws-service/src/core/middleware/passport-config.ts)

Validate the single id and return a trimmed identity (this also closes part of F-2):

```ts
async (jwt_payload: JwtPayload, done: VerifiedCallback) => {
  if (!jwt_payload?.id) return done(null, false);

  const user = await authenticationService.findUserById(jwt_payload.id);
  if (!user) return done(null, false);

  return done(null, { id: user.id, email: user.email, role: user.role });
}
```

Import `JwtPayload` from `../../types` instead of `jsonwebtoken`.

### 6. Remove dead helpers — [authentication.service.ts](healthy-paws-service/src/features/authentication/authentication.service.ts) and [authentication.repository.ts](healthy-paws-service/src/features/authentication/authentication.repository.ts)

Delete `findOwnerIdByUserId` and `findDoctorIdByUserId` from both layers. They exist only to bridge `Users.id -> Owners.id/Doctors.id` (F-33).

### 7. Owners — [src/features/owners/owners.repository.ts](healthy-paws-service/src/features/owners/owners.repository.ts) and [src/features/owners/owners.resolvers.ts](healthy-paws-service/src/features/owners/owners.resolvers.ts)

- `getOwnerById`: `SELECT id, name FROM Owners` (drop `user_id`).
- `updateOwnerProfile`: `RETURNING id, name` (drop `user_id`).
- `getOwnerEmail`: rename param to `ownerId` semantically; body unchanged.
- Resolver: `email: (owner) => getOwnerEmail(owner.id)` (was `owner.user_id`).

### 8. Doctors — [src/features/doctors/doctors.repository.ts](healthy-paws-service/src/features/doctors/doctors.repository.ts) and [src/features/doctors/doctors.resolvers.ts](healthy-paws-service/src/features/doctors/doctors.resolvers.ts)

- `getEmailDoctor`: rename param to `doctorId` semantically.
- Resolver: `email: (doctor) => getEmailDoctor(doctor.id)`.

### 9. Pets — [src/features/pets/pets.loaders.ts](healthy-paws-service/src/features/pets/pets.loaders.ts) and [src/features/pets/pets.repository.ts](healthy-paws-service/src/features/pets/pets.repository.ts)

- `batchOwnersByPetIds`: drop `o.user_id` from the SELECT and from the mapped Owner object.
- `getOwnerByPet`: drop `o.user_id` from the SELECT.

### 10. Tests — [authentication.service.test.ts](healthy-paws-service/src/features/authentication/authentication.service.test.ts)

No payload-shape change needed (test already uses `{ id, email, role }`). Re-run after the edits to make sure nothing regresses.

## What this does NOT change

- Frontend code, GraphQL operations, queries, mutations.
- `PasswordResetTokens.user_id` (still references `Users(id)` — correct).
- The `password_salt` column / `hash` & `salt` in the GraphQL `User` type — those are separate findings (F-21, F-22).
- Rate limiting, email normalization, validation — all out of scope here, handled later.

## Verification after implementation

- `rg "user_id" src/` should show only `PasswordResetTokens` references and parameter names in service files (cosmetic, not functional).
- Lint cleanly.
- Smoke test: register an owner, log in, hit a protected GraphQL mutation (e.g. `updateOwnerProfile`) — must succeed instead of returning `UNAUTHENTICATED`.

## Follow-up suggestions (separate PRs)

- F-2 / H-10: already partially addressed by the trimmed identity in step 5; verify no other code path leaks `password_hash`.
- F-21: drop `hash`/`salt` from the GraphQL `User` SDL.
- F-22: drop the dead `password_salt` column once a separate PR can coordinate it.