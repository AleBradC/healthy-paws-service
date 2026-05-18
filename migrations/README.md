# Database migrations

We use [`node-pg-migrate`](https://salsita.github.io/node-pg-migrate/) for
forward-only schema evolution.

## Why we have a separate baseline file

`database.sql` (mounted at `/docker-entrypoint-initdb.d/database.sql` in the
Postgres container) runs **only on a fresh data volume**. It is convenient for
local dev because the schema appears in one place, but it is useless for any
real environment where the volume already exists.

The `0001_baseline.cjs` migration mirrors the contents of `database.sql` using
idempotent `CREATE … IF NOT EXISTS` statements. Net effect:

- **Fresh DB:** `database.sql` runs first via the init hook, then this
  migration runs and records itself in `pgmigrations` as applied (no-op).
- **Existing DB:** the init hook never runs; this migration applies, sees the
  tables already exist, and records itself as applied.

Either way, future migrations land on a consistent baseline.

## Day-to-day usage

```bash
# create a new migration (timestamped, JavaScript)
npm run migrate:create -- my-change-description

# apply all pending migrations
DATABASE_URL=postgres://… npm run migrate:up

# revert the most recent migration
DATABASE_URL=postgres://… npm run migrate:down
```

`DATABASE_URL` is the simplest way to point the tool at Postgres; the existing
`DB_*` env vars are not consumed by `node-pg-migrate` directly. The migrate
container in `docker-compose.yml` already wires this up.
