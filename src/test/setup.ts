// Provides default values for env vars that are validated at module-load time
// (e.g. src/core/config/jwt.ts throws if JWT_SECRET is missing). This lets the
// test suite import service modules without requiring a real .env file or any
// CI workflow env config. Real values from process.env / dotenv are preserved
// because we only fill in vars that are not already set.

process.env.JWT_SECRET ??= "test-jwt-secret";
