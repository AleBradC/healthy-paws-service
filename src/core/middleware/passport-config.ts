import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { AuthRepository } from "../../features/authentication/auth.repository";
import { AuthenticationService } from "../../features/authentication/auth.service";
import pool from "../config/db";

// 1. Create instances of the layers, which will be used by Passport.
// This is the composition root for Passport's dependencies.
const authRepository = new AuthRepository(pool);
const authService = new AuthenticationService(authRepository);

// 2. Configure the Passport LocalStrategy
passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        // The strategy now uses the authService instance
        const user = await authService.validateUser(email, password);
        if (!user) {
          return done(null, false, { message: "Invalid email or password." });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// 3. Configure user serialization for sessions
// This tells Passport how to store the user in the session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// 4. Configure user deserialization for sessions
// This tells Passport how to retrieve the user from the session on subsequent requests
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await authService.findUserById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// 5. Export only the configured passport instance
export { passport };
