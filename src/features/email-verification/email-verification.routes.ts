import { Router } from "express";
import pool from "../../core/config/db";
import { EmailVerificationRepository } from "./email-verification.repository";
import { EmailVerificationService } from "./email-verification.service";
import { EmailVerificationController } from "./email-verification.controller";
import {
  sendCodeLimiter,
  resetLimiter,
} from "../../core/middleware/rate-limit";

const router = Router();

const repository = new EmailVerificationRepository(pool);
const service = new EmailVerificationService(repository);
const controller = new EmailVerificationController(service);

// Verify is rate-limited at the same tier as password reset to blunt
// brute-forcing token values (despite the 256-bit entropy making this
// impractical, the rate limit is cheap insurance against a logic bug
// that ever weakens the token).
router.post("/verify-email", resetLimiter, controller.verify);

// Resend reuses sendCodeLimiter (5/hr/IP) because every call dispatches
// an email — the cost profile matches password-reset request.
router.post("/resend-verification", sendCodeLimiter, controller.resend);

export default router;
