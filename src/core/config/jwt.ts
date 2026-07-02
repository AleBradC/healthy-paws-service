import type { SignOptions } from "jsonwebtoken";
import { SystemErrorMessages } from "../../errors/constants";
import { SystemError } from "../../errors/SystemError";

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
