import type { SignOptions } from "jsonwebtoken";
import { SystemErrorMessages } from "../../errors/constants";
import { SystemError } from "../../errors/SystemError";

// Single source of truth for JWT config. Env is read and validated once at
// module load — fail-fast at boot for missing JWT_SECRET, and the sign side
// and verify side cannot drift because they consume the same frozen object.
const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new SystemError(SystemErrorMessages.JWT_SECRET_UNDEFINED);
}

export const JWT_CONFIG = Object.freeze({
  secret,
  expiresIn: (process.env.JWT_EXPIRES_IN ?? "1h") as SignOptions["expiresIn"],
  issuer: process.env.JWT_ISSUER ?? "healthy-paws",
  audience: process.env.JWT_AUDIENCE ?? "healthy-paws-client",
});
