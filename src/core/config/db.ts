import pg from "pg";

const { Pool } = pg;

// Pool sizing notes:
// - `max` caps concurrent connections. A t3.micro Postgres tops out around
//   20 connections; cap the backend at 8 to leave room for pg_dump backups,
//   psql sessions, and a future second backend instance.
// - `idleTimeoutMillis` reaps connections idle for 30s so we don't hold
//   slots on a quiet box.
// - `connectionTimeoutMillis` fails fast (5s) if Postgres is unreachable
//   instead of hanging the request thread.
// - SSL is opt-in via DATABASE_SSL=true for managed Postgres (RDS, Neon).
//   In-compose Postgres on loopback doesn't need it.
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432"),
  max: parseInt(process.env.DB_POOL_MAX || "8", 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl:
    process.env.DATABASE_SSL === "true"
      ? { rejectUnauthorized: false }
      : undefined,
});

// Surface unexpected pool errors instead of letting the process crash
// silently when a backend connection is dropped by the network.
pool.on("error", (err) => {
  console.error("Unexpected idle pg client error:", err);
});

export default pool;
