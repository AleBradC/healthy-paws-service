import { Router } from "express";
import { AuthenticationService } from "./authentication.service";
import { AuthenticationRepository } from "./authentication.repository";
import { AuthenticationController } from "./authentication.controller";
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
router.post(
  "/reset-password/send-code",
  sendCodeLimiter,
  authenticationController.startPasswordReset
);
router.post(
  "/reset-password/verify-code",
  resetLimiter,
  authenticationController.verifyResetCode
);
router.post(
  "/reset-password/reset",
  resetLimiter,
  authenticationController.resetPassword
);

export default router;
