---
name: Fix F-13 helmet and CORS
overview: Add helmet for security headers and fix the CORS configuration to read all allowed origins from environment variables rather than hardcoding localhost URLs in source code. Both changes are in app.ts only, plus a dependency install.
todos:
  - id: install-helmet
    content: Install helmet package
    status: completed
  - id: app-helmet-cors
    content: Add helmet() as first middleware and replace hardcoded CORS origins with getAllowedOrigins() in app.ts
    status: completed
  - id: lint-verify
    content: Run lints on app.ts and confirm no errors
    status: completed
isProject: false
---

# Fix F-13: No helmet; CORS hardcodes localhost origins

## The two problems

### 1. No security headers

`app.ts` has no `helmet` middleware. Without it, Express sends no security headers, leaving the app vulnerable to clickjacking, MIME-sniffing, and other browser-level attacks. Helmet sets safe defaults for all of these in one line:

- `X-Frame-Options: SAMEORIGIN` — prevents clickjacking
- `X-Content-Type-Options: nosniff` — blocks MIME-type sniffing
- `Strict-Transport-Security` — enforces HTTPS
- `Content-Security-Policy` — restricts resource loading
- and several others

### 2. CORS origins hardcoded in source

```ts
// current — localhost hardcoded in source
cors({
  origin: process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"]
    : ["http://localhost:5173", "http://localhost:3000"],
  credentials: true,
})
```

Problems:
- The localhost fallbacks are always included, even in production — a production server accepts CORS requests from `http://localhost:5173`
- Adding a new allowed origin requires a code change and redeploy instead of just an env var update

## The fix

### Install `helmet`

```bash
npm install helmet
npm install -D @types/helmet   # not needed — helmet ships its own types
```

(`helmet` ships its own TypeScript types so no separate `@types` package is needed.)

### [`src/app.ts`](healthy-paws-service/src/app.ts)

**Add `helmet`** — must be the very first middleware so headers are applied to every response:

```ts
import helmet from "helmet";
// ...
app.use(helmet());
```

**Fix CORS** — read a comma-separated `ALLOWED_ORIGINS` env var; fall back to dev origins only when `NODE_ENV` is explicitly `development`:

```ts
const getAllowedOrigins = (): string[] => {
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
  }
  if (process.env.NODE_ENV !== "production") {
    return ["http://localhost:5173", "http://localhost:3000"];
  }
  return []; // no origin allowed in production without explicit config
};

app.use(
  cors({
    origin: getAllowedOrigins(),
    credentials: true,
  })
);
```

In `.env` (development):
```
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

In production:
```
ALLOWED_ORIGINS=https://healthypaws.example.com
```

The hardcoded localhost strings are gone from source. Adding or changing an origin is a config change, not a code change.

### Helmet and Apollo Server

Helmet's default `Content-Security-Policy` blocks the Apollo Sandbox/GraphiQL UI (inline scripts). Since this is a backend API with no browser-facing GraphQL UI in production, the default CSP is fine. If the GraphQL playground is needed in development, it can be disabled with `helmet({ contentSecurityPolicy: false })` conditionally — but that is outside the scope of this fix.

## Files changed

- `healthy-paws-service/package.json` — add `helmet` dependency
- [`healthy-paws-service/src/app.ts`](healthy-paws-service/src/app.ts) — import and apply `helmet()`; replace hardcoded CORS origins with `getAllowedOrigins()` helper