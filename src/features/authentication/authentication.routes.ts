import { Router } from "express";
import { AuthenticationService } from "./authentication.service";
import { AuthenticationRepository } from "./authentication.repository";
import { AuthenticationController } from "./authentication.controller";
import { optionalJwt } from "../../core/middleware/optional-jwt";
import pool from "../../core/config/db";
import {
  loginLimiter,
  sendCodeLimiter,
  resetLimiter,
} from "../../core/middleware/rate-limit";

const router = Router();

const authenticationRepository = new AuthenticationRepository(pool);
const authenticationService = new AuthenticationService(
  authenticationRepository
);
const authenticationController = new AuthenticationController(
  authenticationService
);

router.post("/login", loginLimiter, authenticationController.login);
router.post("/logout", authenticationController.logout);
// /session is a state-inquiry endpoint, not a protected resource. It uses
// optionalJwt so a missing or stale cookie does not 401 the request — the
// controller answers "yes you have a session" or "no you don't" with 200.
router.get("/session", optionalJwt, authenticationController.session);
router.post(
  "/reset-password/request",
  sendCodeLimiter,
  authenticationController.startPasswordReset
);
router.post(
  "/reset-password/reset",
  resetLimiter,
  authenticationController.resetPassword
);

export default router;
