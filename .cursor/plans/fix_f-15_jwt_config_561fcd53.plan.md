---
name: Fix F-15 JWT Config
overview: Move JWT lifetime, issuer, and audience out of source code into environment variables, and make passport-jwt validate the issuer and audience claims on every incoming token.
todos:
  - id: jwt-sign-options
    content: Read JWT_EXPIRES_IN, JWT_ISSUER, JWT_AUDIENCE from env in generateAccessToken (authentication.service.ts)
    status: completed
  - id: jwt-passport-validate
    content: Add issuer and audience to jwtOptions in passport-config.ts so Passport validates both claims on every request
    status: completed
  - id: jwt-payload-type
    content: Extend JwtPayload in types.ts with optional iss and aud fields
    status: completed
isProject: false
---

# Fix F-15: JWT lifetime / issuer / audience hardcoded

## The three problems

### 1. Lifetime hardcoded

[`authentication.service.ts`](healthy-paws-service/src/features/authentication/authentication.service.ts) line 43:

```ts
return jwt.sign(payload, secret, { expiresIn: "1h" });
```

Changing the token lifetime (e.g. 15 min in production) requires a code edit and redeploy.

### 2. No `issuer` (`iss`) claim on signing

`jwt.sign` passes no `issuer`. A JWT from this service is structurally identical to one issued by any other service using the same secret.

### 3. No `issuer` / `audience` validation on verification

[`passport-config.ts`](healthy-paws-service/src/core/middleware/passport-config.ts) `jwtOptions` only sets `jwtFromRequest` and `secretOrKey`:

```ts
const jwtOptions: StrategyOptions = {
  jwtFromRequest: cookieExtractor,
  secretOrKey: JWT_SECRET,
  // ← no issuer or audience check
};
```

Tokens issued by a different service (or for a different purpose) are silently accepted.

## The fix

Three new env vars with safe defaults so existing dev setups don't break:

- `JWT_EXPIRES_IN` — defaults to `"1h"`
- `JWT_ISSUER` — defaults to `"healthy-paws"`
- `JWT_AUDIENCE` — defaults to `"healthy-paws-client"`

### [`authentication.service.ts`](healthy-paws-service/src/features/authentication/authentication.service.ts)

Replace the hardcoded sign options:

```ts
return jwt.sign(payload, secret, {
  expiresIn: (process.env.JWT_EXPIRES_IN ?? "1h") as jwt.SignOptions["expiresIn"],
  issuer:    process.env.JWT_ISSUER   ?? "healthy-paws",
  audience:  process.env.JWT_AUDIENCE ?? "healthy-paws-client",
});
```

### [`passport-config.ts`](healthy-paws-service/src/core/middleware/passport-config.ts)

Add matching `issuer` and `audience` fields to `jwtOptions` so passport-jwt rejects any token that doesn't carry the expected claims:

```ts
const jwtOptions: StrategyOptions = {
  jwtFromRequest: cookieExtractor,
  secretOrKey:    JWT_SECRET,
  issuer:         process.env.JWT_ISSUER   ?? "healthy-paws",
  audience:       process.env.JWT_AUDIENCE ?? "healthy-paws-client",
};
```

### [`types.ts`](healthy-paws-service/src/types.ts)

Extend `JwtPayload` so TypeScript reflects the actual token shape:

```ts
export interface JwtPayload {
  id:    string;
  email: string;
  role:  ROLES;
  iss?:  string;
  aud?:  string | string[];
  iat?:  number;
  exp?:  number;
}
```

## Files changed

- [`healthy-paws-service/src/features/authentication/authentication.service.ts`](healthy-paws-service/src/features/authentication/authentication.service.ts) — read `JWT_EXPIRES_IN`, `JWT_ISSUER`, `JWT_AUDIENCE` from env; pass all three to `jwt.sign`
- [`healthy-paws-service/src/core/middleware/passport-config.ts`](healthy-paws-service/src/core/middleware/passport-config.ts) — add `issuer` and `audience` to `jwtOptions`
- [`healthy-paws-service/src/types.ts`](healthy-paws-service/src/types.ts) — add optional `iss` and `aud` to `JwtPayload`
