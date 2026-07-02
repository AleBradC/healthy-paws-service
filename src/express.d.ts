import type { ROLES } from "./types";

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
