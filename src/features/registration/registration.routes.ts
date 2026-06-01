import { Router } from "express";
import pool from "../../core/config/db";
import { RegistrationRepository } from "./registration.repository";
import { RegistrationService } from "./registration.service";
import { RegistrationController } from "./registration.controller";
import { registrationLimiter } from "../../core/middleware/rate-limit";


const router = Router();

const registrationRepository = new RegistrationRepository(pool);
const registrationService = new RegistrationService(
  registrationRepository
);
const registrationController = new RegistrationController(registrationService);

router.post("/register/owner", registrationLimiter, registrationController.registerOwner);
router.post("/register/doctor", registrationLimiter, registrationController.registerDoctor);

export default router;
