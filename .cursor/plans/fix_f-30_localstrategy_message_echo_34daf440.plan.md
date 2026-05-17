---
name: Fix F-30 LocalStrategy message echo
overview: Stop echoing `passport-local`'s `info.message` through `ClientError` to the client. Always return a single fixed `INVALID_CREDENTIALS` string for any non-user outcome, and drop the now-unused `message` from the verify callback so future maintainers can't accidentally widen the leak.
todos:
  - id: controller
    content: Drop the info parameter from the passport.authenticate callback in authentication.controller.ts and always pass INVALID_CREDENTIALS to ClientError
    status: completed
  - id: strategy
    content: Remove the now-unused { message } from done(null, false, ...) in passport-config.ts LocalStrategy verify callback
    status: completed
isProject: false
---

## The problem

The login controller forwards whatever string the LocalStrategy puts in `info.message` straight into the response:

```19:39:healthy-paws-service/src/features/authentication/authentication.controller.ts
public login = (req: Request, res: Response, next: NextFunction): void => {
    passport.authenticate(
      "local",
      { session: false },
      async (
        err: Error | null,
        user: UserResponse | false,
        info: { message?: string }
      ) => {
        if (err) {
          return next(err);
        }

        if (!user) {
          return next(
            new ClientError(
              info?.message || ClientErrorMessages.INVALID_CREDENTIALS,
              401
            )
          );
        }
```

`ClientError.message` is rendered verbatim by the global error handler:

```20:26:healthy-paws-service/src/core/middleware/error-middleware.ts
if (err instanceof ClientError) {
    const response: ApiResponse = {
      status: "error",
      message: err.message,
    };
    return res.status(err.statusCode).json(response);
  }
```

Today the strategy only ever sets `INVALID_CREDENTIALS`, so the wire is currently safe:

```21:39:healthy-paws-service/src/core/middleware/passport-config.ts
passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const user = await authenticationService.validateUser(email, password);
        if (!user) {
          return done(null, false, {
            message: ClientErrorMessages.INVALID_CREDENTIALS,
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);
```

But the *pattern* is the wrong default. The first time someone adds a "more useful" message in the verify callback — `"Account locked"`, `"Email not verified"`, `"Password expired"`, or even a `done(null, false, { message: err.message })` for debugging — that string ships to the client. That re-opens the enumeration channel F-4 just closed (timing) on the textual side, and risks leaking internal error text.

Every other auth response in this codebase is sourced from the `ClientErrorMessages` / `SuccessMessages` enums precisely so the controller is the single place that decides what the user sees. The login path is the lone exception.

## The fix

Two small, behavior-preserving edits. The current wire-level response stays exactly the same because the only message in play today is already `INVALID_CREDENTIALS`.

### [healthy-paws-service/src/features/authentication/authentication.controller.ts](healthy-paws-service/src/features/authentication/authentication.controller.ts)

Drop the `info` parameter entirely and hardcode the client-facing message. The controller stops trusting strategy callbacks to police their own strings.

```ts
public login = (req: Request, res: Response, next: NextFunction): void => {
  passport.authenticate(
    "local",
    { session: false },
    async (err: Error | null, user: UserResponse | false) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return next(
          new ClientError(ClientErrorMessages.INVALID_CREDENTIALS, 401)
        );
      }

      // ...rest unchanged (token, cookie, response)
    }
  )(req, res, next);
};
```

The `info: { message?: string }` type goes away with the parameter, so no inline ts-ignore or dead-arg pattern is left behind.

### [healthy-paws-service/src/core/middleware/passport-config.ts](healthy-paws-service/src/core/middleware/passport-config.ts)

Now that the controller never reads `info.message`, drop the `message` property from `done(null, false, ...)` so the option to leak strings is removed at the source.

```ts
async (email, password, done) => {
  try {
    const user = await authenticationService.validateUser(email, password);
    if (!user) {
      return done(null, false);
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}
```

If someone later wants to surface a richer state ("Account locked", etc.), the right move will be to add a typed enum branch in the controller — not a free-form string from the strategy.

## Why this is the right shape (and not more)

- The login path is the only place that consumes passport's `info` callback. JwtStrategy in the same file never passes a third `done` argument, so there's nothing analogous to clean up there.
- Logout and `/session` already use inline string literals (`"Logged out."`, `"Unauthorised."`) instead of `SuccessMessages` / `ClientErrorMessages`. Same code smell, different finding — out of scope for F-30.
- The global error middleware already maps `ClientError` → wire message correctly. No middleware change needed.
- Frontend impact: zero. The wire response shape is identical (`status: "error", message: "Invalid email or password."`, HTTP 401).

## Verification

- `POST /api/auth/login` with a non-existent email returns 401 + `"Invalid email or password."` — unchanged.
- `POST /api/auth/login` with a known email + wrong password returns 401 + `"Invalid email or password."` — unchanged.
- A throwing `validateUser` (e.g. DB outage) still routes through `next(err)` → `SystemError` → 500 + `INTERNAL_SERVER_ERROR` — unchanged.
- TypeScript still compiles: the verify callback's third argument is optional, and the controller no longer references it.
- Lint pass on both touched files.

## Files changed

- [healthy-paws-service/src/features/authentication/authentication.controller.ts](healthy-paws-service/src/features/authentication/authentication.controller.ts) - drop `info` parameter; always pass `INVALID_CREDENTIALS` to `ClientError`.
- [healthy-paws-service/src/core/middleware/passport-config.ts](healthy-paws-service/src/core/middleware/passport-config.ts) - remove the `message` property from `done(null, false, ...)`.
