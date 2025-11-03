import { Router } from "express";
import pool from "../../core/config/db";
import { RegistrationRepository } from "./registration.repository";
import { RegistrationService } from "./registration.service";
import { RegistrationController } from "./registration.controller";

const router = Router();

const registrationRepository = new RegistrationRepository(pool);
const registrationService = new RegistrationService(registrationRepository);
const registrationController = new RegistrationController(registrationService);

router.post("/register", registrationController.register);

export default router;
