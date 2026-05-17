import type { ROLES } from "./types";

// Augment Express.User so req.user is typed as the JWT payload set by
// the passport-jwt strategy in src/core/middleware/passport-config.ts.
// Fields are declared inline (rather than `extends JwtPayload`) so this
// file doesn't trip the `@typescript-eslint/no-empty-object-type` rule.
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      role: ROLES;
      iss?: string;
      aud?: string | string[];
      iat?: number;
      exp?: number;
    }
  }
}

export {};
