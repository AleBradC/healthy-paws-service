---
name: Fix F-21 Remove User SDL
overview: Remove the dead, leaky User type (with hash and salt fields) from the GraphQL SDL plus its orphan UserRole enum, and delete the matching unused TypeScript User interface. Both define hash/salt fields that must never be exposed and have zero references in resolvers, queries, or imports.
todos:
  - id: remove-user-sdl
    content: Delete type User and enum UserRole from typeDefs.graphql
    status: completed
  - id: remove-user-interface
    content: Delete the unused User interface from types.ts
    status: completed
isProject: false
---

# Fix F-21: GraphQL User SDL exposes hash and salt

## The problem

[`typeDefs.graphql`](healthy-paws-service/src/schema/typeDefs.graphql) declares:

```graphql
type User {
  id: ID!
  email: String!
  hash: String!
  salt: String!
  role: UserRole!
}
```

`hash` and `salt` are credential fields that must never be reachable via the public GraphQL API. The SDL itself is part of the public surface — any introspection query reveals that the server models a `User` type with `hash` and `salt`. That alone is a schema-level disclosure of the auth model, even though no resolver currently returns these fields.

## Why removal is safe

The `User` type is **entirely dead**:

- No `Query.user`, `Query.users`, or `Query.me` returns it.
- No other type has a `User` field anywhere in the schema.
- The resolver map in [`schema/resolvers.ts`](healthy-paws-service/src/schema/resolvers.ts) has no `User` entry.
- The frontend [`operations.graphql`](healty-paws-frontend/src/lib/graphql/operations.graphql) never selects from `User`.

The `UserRole` enum is only referenced by the `User` type itself (`role: UserRole!`) — once `User` goes, `UserRole` is orphaned too.

A mirror copy of the same problem lives in TypeScript at [`types.ts`](healthy-paws-service/src/types.ts):

```ts
export interface User {
  id: string;
  email: string;
  hash?: string;
  salt?: string;
  role: "owner" | "doctor";
}
```

A `rg` for imports of this interface returns zero matches — it's a vestige from before the F-2 refactor and is safe to remove. The real auth pipeline uses `UserRecord` / `SafeUserRecord` / `UserResponse`, which already keep credentials out of safe projections.

## The fix

### [`typeDefs.graphql`](healthy-paws-service/src/schema/typeDefs.graphql)

Delete two blocks:

- `enum UserRole { owner; doctor }` (lines 14-17)
- `type User { id, email, hash, salt, role }` (lines 22-28)

After deletion the "Enums" section keeps only `AppointmentStatus`, and the "Core Object Types" section starts directly with `type Owner`.

### [`types.ts`](healthy-paws-service/src/types.ts)

Delete the unused `User` interface (the block under `// --- GRAPHQL ENTITY TYPES ---` that defines `User { id, email, hash?, salt?, role }`). The `Owner`, `Doctor`, `Pet`, etc. interfaces below it stay — they're actively used by the GraphQL resolvers and frontend.

## What stays untouched

- `UserRecord` / `SafeUserRecord` / `UserResponse` / `JwtPayload` — the actual types used by auth and registration. They already correctly hide credentials (F-2 work).
- The `ROLES` enum in `constants.ts` — the real source of truth for role values used throughout the codebase.

## Verification after change

- No resolver references `User` → no runtime breakage.
- No TS import references the `User` interface → no compile breakage.
- Introspection (`__schema { types { name } }`) will no longer list `User` or `UserRole`. The schema stops disclosing the existence of credential fields.

## Files changed

- [`healthy-paws-service/src/schema/typeDefs.graphql`](healthy-paws-service/src/schema/typeDefs.graphql) — remove `type User` and `enum UserRole`
- [`healthy-paws-service/src/types.ts`](healthy-paws-service/src/types.ts) — remove the unused `User` interface
