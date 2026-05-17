---
name: Fix F-22 Drop password_salt
overview: Drop the unused password_salt column from the Users table and remove every code path that carries the always-empty salt value. bcrypt embeds its salt inside the hash string itself, so a separate column has never had a purpose. The change touches the DB schema, two types, two repositories, and the registration/auth services.
todos:
  - id: db-schema
    content: Drop password_salt column from Users table in database.sql
    status: completed
  - id: types
    content: Remove password_salt from UserRecord and salt from CreateOwnerArgs, CreateDoctorArgs, UpdateUserPasswordParams in types.ts
    status: completed
  - id: registration-repo
    content: Remove password_salt from both INSERTs and the salt destructuring in registration.repository.ts
    status: completed
  - id: registration-service
    content: "Drop the two salt: \"\" lines from registration.service.ts callers"
    status: completed
  - id: auth-repo
    content: Update authentication.repository.ts updateUserPassword to drop newSalt param and the column update
    status: completed
  - id: auth-service
    content: Update authentication.service.ts resetPassword to drop the empty-string third arg
    status: completed
isProject: false
---

# Fix F-22: Dead password_salt column

## The problem

[`database.sql`](healthy-paws-service/database.sql) line 8:
```sql
password_salt TEXT NOT NULL,
```

But every write site stores `""`:

```ts
// registration.service.ts (twice)
salt: "", // bcrypt salt is embedded in the hash

// authentication.service.ts (in resetPassword)
"" // bcrypt salt is embedded in the hash
```

The comment is correct: bcrypt encodes the salt inside the hash string (`$2b$12$<22-char-salt><31-char-hash>`). A separate `password_salt` column was never necessary. What we have today is:

- A `NOT NULL` column that always holds an empty string — wasted storage and a misleading schema.
- A `salt` argument threaded through every registration and password-reset code path solely to pass `""` around.
- `UserRecord.password_salt` returned from `findUserByEmail`, which still uses `SELECT *` — so a field that exists only to be empty is being shipped from DB → repo → service on every login.

## The fix

### Database

#### [`database.sql`](healthy-paws-service/database.sql)

Drop the column from the `Users` table definition:

```sql
CREATE TABLE Users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL CHECK(role IN ('owner', 'doctor')),
    image_url TEXT
);
```

For an existing populated database (one-time migration outside this codebase):

```sql
ALTER TABLE Users DROP COLUMN password_salt;
```

### Types — [`types.ts`](healthy-paws-service/src/types.ts)

```ts
// UserRecord — drop password_salt
export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  role: ROLES;
}

// CreateOwnerArgs — drop salt
export interface CreateOwnerArgs {
  email: string;
  hash: string;
  role: ROLES.OWNER_ROLE;
  ownerName: string;
  petData: PetPayload;
}

// CreateDoctorArgs — drop salt
export interface CreateDoctorArgs {
  email: string;
  hash: string;
  role: ROLES.DOCTOR_ROLE;
  doctorData: DoctorPayload;
}

// UpdateUserPasswordParams — drop salt
export interface UpdateUserPasswordParams {
  userId: string;
  hash: string;
}
```

### Registration — [`registration.repository.ts`](healthy-paws-service/src/features/registration/registration.repository.ts)

Both INSERTs (owner and doctor) drop `password_salt` from columns and the parameter:

```ts
const { email, hash, role, ownerName, petData } = args;
// ...
"INSERT INTO Users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email",
[email, hash, role]
```

### Registration service — [`registration.service.ts`](healthy-paws-service/src/features/registration/registration.service.ts)

Remove the `salt: ""` lines from both `registerOwner` and `registerDoctor`:

```ts
return await this.registrationRepository.createOwnerAndPet({
  email: normalizedEmail,
  hash,
  role: ROLES.OWNER_ROLE,
  ownerName: payload.owner.name,
  petData: payload.pet,
});
```

(and the mirror block for `createDoctorWithDetails`).

### Auth repository — [`authentication.repository.ts`](healthy-paws-service/src/features/authentication/authentication.repository.ts)

`updateUserPassword` drops the `newSalt` parameter and the column update:

```ts
public async updateUserPassword(
  userId: string,
  newHash: string
): Promise<void> {
  await this.db.query(
    `UPDATE Users SET password_hash = $1 WHERE id = $2`,
    [newHash, userId]
  );
}
```

### Auth service — [`authentication.service.ts`](healthy-paws-service/src/features/authentication/authentication.service.ts)

`resetPassword` drops the third argument in the call:

```ts
await this.authenticationRepository.updateUserPassword(
  user.id,
  hashedPassword,
);
```

## What stays untouched

- `password_hash` column and field — still the real source of truth (bcrypt format with embedded salt).
- The bcrypt cost factor changes from F-14, the dummy-hash timing fix from F-4, and the F-2 narrowing of `findUserById` — none of those depend on the `salt` plumbing.
- `SafeUserRecord` — already credential-free.

## Verification after change

- TypeScript compile passes — every `salt`/`password_salt` reference is gone.
- Registration insert, login bcrypt compare, and password reset update all still work because bcrypt only needs the hash string itself.
- `SELECT * FROM Users` in `findUserByEmail` returns one fewer column; `UserRecord` is updated to match, so the typed result stays consistent.

## Files changed

- [`healthy-paws-service/database.sql`](healthy-paws-service/database.sql) — drop `password_salt` column from `Users`
- [`healthy-paws-service/src/types.ts`](healthy-paws-service/src/types.ts) — drop `password_salt` from `UserRecord`; drop `salt` from `CreateOwnerArgs`, `CreateDoctorArgs`, `UpdateUserPasswordParams`
- [`healthy-paws-service/src/features/registration/registration.repository.ts`](healthy-paws-service/src/features/registration/registration.repository.ts) — drop `password_salt` from both INSERTs and the destructured `salt` arg
- [`healthy-paws-service/src/features/registration/registration.service.ts`](healthy-paws-service/src/features/registration/registration.service.ts) — drop the two `salt: ""` lines passed to the repository
- [`healthy-paws-service/src/features/authentication/authentication.repository.ts`](healthy-paws-service/src/features/authentication/authentication.repository.ts) — `updateUserPassword` drops the `newSalt` parameter and the column update
- [`healthy-paws-service/src/features/authentication/authentication.service.ts`](healthy-paws-service/src/features/authentication/authentication.service.ts) — `resetPassword` no longer passes `""` as the third arg
