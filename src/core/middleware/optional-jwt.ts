import type { NextFunction, Request, Response } from "express";
import { passport } from "./passport-config";

export const optionalJwt = (
  req: Request,
  res: Response,
  next: NextFunction,
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
    },
  )(req, res, next);
};
