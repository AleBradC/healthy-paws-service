import type { NextFunction, Request, Response } from "express";
import { passport } from "./passport-config";

// optionalJwt populates req.user if a valid JWT cookie is present and
// otherwise calls next() without responding. It also proactively clears
// the cookie when a cookie WAS sent but failed verification (expired,
// invalid signature, or no longer matching a user), so stale state on
// the browser doesn't accumulate. Use this for read-only state-inquiry
// endpoints like /api/auth/session. Genuinely protected routes should
// still use passport.authenticate(...) as middleware so they 401.
export const optionalJwt = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  passport.authenticate(
    "jwt",
    { session: false },
    (err: unknown, user: Express.User | false) => {
      if (err) {
        return next(err);
      }

      if (user) {
        req.user = user;
        return next();
      }

      // No user: either no cookie was sent (normal) or the cookie was
      // present but rejected (stale). In the second case, evict it so
      // the browser stops carrying garbage on every subsequent request.
      const hadCookie = Boolean(req.cookies?.accessToken);
      if (hadCookie) {
        res.clearCookie("accessToken", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
        });
      }
      next();
    }
  )(req, res, next);
};
