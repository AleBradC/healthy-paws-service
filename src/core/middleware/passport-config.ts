import passport from "passport";
import { Request } from "express";
import { Strategy as LocalStrategy } from "passport-local";
import {
  Strategy as JwtStrategy,
  type StrategyOptions,
  type VerifiedCallback,
} from "passport-jwt";
import pool from "../config/db";
import { JWT_CONFIG } from "../config/jwt";
import { AuthenticationService } from "../../features/authentication/authentication.service";
import { AuthenticationRepository } from "../../features/authentication/authentication.repository";
import { JwtPayload } from "../utils/types";

const authenticationRepository = new AuthenticationRepository(pool);
const authenticationService = new AuthenticationService(
  authenticationRepository,
);

export type LocalInfo = { reason: "invalid" };

passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const result = await authenticationService.validateUser(
          email,
          password,
        );

        switch (result.status) {
          case "ok":
            return done(null, result.user);

          case "invalid-credentials":
          default:
            return done(null, false, { reason: "invalid" } as unknown as {
              message: string;
            });
        }
      } catch (err) {
        return done(err);
      }
    },
  ),
);

// Extract the JWT from the httpOnly cookie instead of the Authorization header.
// The cookie is inaccessible to JavaScript, preventing XSS token theft.
const cookieExtractor = (req: Request): string | null =>
  req?.cookies?.accessToken ?? null;

const jwtOptions: StrategyOptions = {
  jwtFromRequest: cookieExtractor,
  secretOrKey: JWT_CONFIG.secret,
  issuer: JWT_CONFIG.issuer,
  audience: JWT_CONFIG.audience,
};

passport.use(
  new JwtStrategy(
    jwtOptions,
    async (jwt_payload: JwtPayload, done: VerifiedCallback) => {
      try {
        if (!jwt_payload?.id) {
          return done(null, false);
        }

        const user = await authenticationService.findUserById(jwt_payload.id);
        if (!user) {
          return done(null, false);
        }

        return done(null, {
          id: user.id,
          email: user.email,
          role: user.role,
        });
      } catch (err) {
        return done(err, false);
      }
    },
  ),
);

export { passport };
