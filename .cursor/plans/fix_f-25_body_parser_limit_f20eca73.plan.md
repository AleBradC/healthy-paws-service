---
name: Fix F-25 Body Parser Limit
overview: Pin body-parser limits explicitly (no more reliance on the implicit 100KB default), make them configurable via env, and surface 413 PayloadTooLargeError as a clean JSON response instead of a misleading 500.
todos:
  - id: body-parser-limits
    content: Pin explicit env-driven limits on bodyParser.json and bodyParser.urlencoded in app.ts (BODY_LIMIT_JSON, BODY_LIMIT_URLENCODED, URLENCODED_PARAMETER_LIMIT)
    status: completed
  - id: payload-too-large-constant
    content: Add ClientErrorMessages.PAYLOAD_TOO_LARGE in errors/constants.ts
    status: completed
  - id: error-middleware-413
    content: Handle body-parser PayloadTooLargeError (err.type === 'entity.too.large') in globalErrorHandler and return HTTP 413 with PAYLOAD_TOO_LARGE message
    status: completed
isProject: false
---

# Fix F-25: Body parser default 100 KB limit

## The problem

```53:54:healthy-paws-service/src/app.ts
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
```

Three issues:

- **Implicit default.** body-parser silently applies `limit: "100kb"`. Anyone reading the code can't see what the limit is, and a future body-parser version could change it without notice.
- **No `parameterLimit` on urlencoded.** `extended: true` parses arbitrarily nested objects via `qs`. The default `parameterLimit: 1000` is fine, but it's invisible.
- **413 leaks as 500.** When body-parser rejects an oversize request it throws `PayloadTooLargeError` with `err.type === "entity.too.large"` and `err.statusCode === 413`. The current [`globalErrorHandler`](healthy-paws-service/src/core/middleware/error-middleware.ts) doesn't recognize that shape — it hits the final `UNHANDLED EXCEPTION` branch and returns a `500 internal_server_error`, which both mislabels the failure and hides the real cause.

The application has no file-upload feature today (no `multer`, no multipart, no base64 image flows; `image_url` is a schema column that's never written), so 100KB is already generous. The fix is to make the value explicit and configurable, not to make it bigger.

## The fix

### 1. Pin limits in [`src/app.ts`](healthy-paws-service/src/app.ts)

Read from env with safe defaults. Keep `100kb` as the default — same effective behavior as today, but now declared in source.

```ts
const BODY_LIMIT_JSON = process.env.BODY_LIMIT_JSON ?? "100kb";
const BODY_LIMIT_URLENCODED = process.env.BODY_LIMIT_URLENCODED ?? "100kb";
const URLENCODED_PARAMETER_LIMIT = Number(
  process.env.URLENCODED_PARAMETER_LIMIT ?? "1000"
);

app.use(bodyParser.json({ limit: BODY_LIMIT_JSON }));
app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: BODY_LIMIT_URLENCODED,
    parameterLimit: URLENCODED_PARAMETER_LIMIT,
  })
);
```

Operators who want to be stricter (e.g., 32kb) can set `BODY_LIMIT_JSON=32kb` without code changes.

### 2. Handle 413 in [`src/core/middleware/error-middleware.ts`](healthy-paws-service/src/core/middleware/error-middleware.ts)

Add a small branch above the `SystemError` block to catch body-parser's payload error shape and return the correct status with a non-misleading message.

```ts
if (
  err &&
  typeof err === "object" &&
  "type" in err &&
  (err as { type: string }).type === "entity.too.large"
) {
  const response: ApiResponse = {
    status: "error",
    message: ClientErrorMessages.PAYLOAD_TOO_LARGE,
  };
  return res.status(413).json(response);
}
```

The `err.type === "entity.too.large"` check matches what body-parser actually emits and is more specific than checking `statusCode`, which other libraries also set.

### 3. Add `PAYLOAD_TOO_LARGE` to [`src/errors/constants.ts`](healthy-paws-service/src/errors/constants.ts)

Keep error messages enum-driven, consistent with the existing pattern.

```ts
export enum ClientErrorMessages {
  // ...existing entries...
  PAYLOAD_TOO_LARGE = "Request payload is too large.",
}
```

## What stays untouched

- `expressMiddleware(server, { context })` on `/graphql` — the outer global `bodyParser.json` parses the body, so the new limit applies to GraphQL automatically without any per-route mounting.
- All REST endpoints (`/api/auth/*`) — same parser, same limit.
- `helmet`, CORS, cookie-parser, passport wiring — unchanged.
- No file-upload code exists, so no carve-outs needed.

## Verification after change

- `POST /api/auth/login` with body > 100KB → HTTP **413** with `{ status: "error", message: "Request payload is too large." }` (was: 500 with generic message).
- `POST /graphql` with mutation body > 100KB → HTTP **413** with the same response shape.
- Normal-sized requests → no behavior change.
- Set `BODY_LIMIT_JSON=10kb` and send an 11KB request → **413**.
- Lint pass on the three touched files.

## Files changed

- [`healthy-paws-service/src/app.ts`](healthy-paws-service/src/app.ts) — env-driven explicit `limit` and `parameterLimit` on the two body-parser middlewares.
- [`healthy-paws-service/src/core/middleware/error-middleware.ts`](healthy-paws-service/src/core/middleware/error-middleware.ts) — recognize `entity.too.large` and respond with 413 + clean JSON.
- [`healthy-paws-service/src/errors/constants.ts`](healthy-paws-service/src/errors/constants.ts) — add `ClientErrorMessages.PAYLOAD_TOO_LARGE`.
