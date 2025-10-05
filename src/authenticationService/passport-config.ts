// Configures the Passport.js local strategy and session management.
// It also sets up user serialization for sessions.
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { AuthenticationService } from "./auth-service";

const authenticationService = new AuthenticationService();

passport.use(
  new LocalStrategy(async (email, password, done) => {
    try {
      const user = await authenticationService.validateUser(email, password);
      if (!user) {
        return done(null, false, { message: "Invalid email or password." });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
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

export { passport, authenticationService };
