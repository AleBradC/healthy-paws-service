import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { AuthenticationService } from "./auth-service";
import pool from "../db"; // <-- Import the database pool

// Pass the database pool to the AuthenticationService constructor
const authenticationService = new AuthenticationService(pool);

passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      // Added usernameField
      try {
        const user = await authenticationService.validateUser(email, password);
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

// Serialize user instance to the session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user instance from the session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await authenticationService.findUserById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

export { passport }; // You no longer need to export the service instance
