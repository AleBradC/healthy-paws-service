import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import {
  Strategy as JwtStrategy,
  ExtractJwt,
  type StrategyOptions,
  type VerifiedCallback,
} from "passport-jwt";
import { JwtPayload } from "jsonwebtoken";
import pool from "../config/db";
import { AuthenticationService } from "../../features/authentication/authentication.service";
import { AuthenticationRepository } from "../../features/authentication/authentication.repository";
import {
  ClientErrorMessages,
  SystemErrorMessages,
} from "../../errors.ts/constants";
import { SystemError } from "../../errors.ts/AppError";

const authenticationRepository = new AuthenticationRepository(pool);
const authenticationService = new AuthenticationService(
  authenticationRepository
);

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

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new SystemError(SystemErrorMessages.JWT_SECRET_UNDEFINED);
}

const jwtOptions: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JWT_SECRET,
};

passport.use(
  new JwtStrategy(
    jwtOptions,
    async (jwt_payload: JwtPayload, done: VerifiedCallback) => {
      try {
        const user = await authenticationService.findUserById(jwt_payload.id);
        if (user) {
          return done(null, user);
        } else {
          return done(null, false);
        }
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

export { passport };
