import { Router } from "express";
import pool from "../../core/config/db";
import { RegistrationRepository } from "./registration.repository";
import { RegistrationService } from "./registration.service";
import { RegistrationController } from "./registration.controller";
import { registrationLimiter } from "../../core/middleware/rate-limit";
import { EmailVerificationRepository } from "../email-verification/email-verification.repository";
import { EmailVerificationService } from "../email-verification/email-verification.service";

const router = Router();

const registrationRepository = new RegistrationRepository(pool);
// Registration shares one EmailVerificationService instance — it's stateless,
// so the cost is just a few bytes of closure references. Wiring it here keeps
// the service constructor explicit instead of reaching for a global singleton.
const emailVerificationService = new EmailVerificationService(
  new EmailVerificationRepository(pool)
);
const registrationService = new RegistrationService(
  registrationRepository,
  emailVerificationService
);
const registrationController = new RegistrationController(registrationService);

router.post("/register/owner", registrationLimiter, registrationController.registerOwner);
router.post("/register/doctor", registrationLimiter, registrationController.registerDoctor);

export default router;
