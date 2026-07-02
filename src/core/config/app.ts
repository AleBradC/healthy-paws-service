import { SystemError } from "../../errors/SystemError";
import { SystemErrorMessages } from "../../errors/constants";

const fromEnv = process.env.FRONTEND_URL?.trim();
const devDefault =
  process.env.NODE_ENV !== "production" ? "http://localhost:5173" : undefined;
const url = fromEnv || devDefault;
if (!url) {
  throw new SystemError(SystemErrorMessages.FRONTEND_URL_UNDEFINED);
}

export const APP_CONFIG = Object.freeze({
  frontendUrl: url.replace(/\/$/, ""),
});
