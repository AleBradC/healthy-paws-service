import { Router } from "express";
import { AuthenticationService } from "./authentication.service";
import { AuthenticationRepository } from "./authentication.repository";
import { AuthenticationController } from "./authentication.controller";
import pool from "../../core/config/db";

const router = Router();

const authenticationRepository = new AuthenticationRepository(pool);
const authenticationService = new AuthenticationService(
  authenticationRepository
);
const authenticationController = new AuthenticationController(
  authenticationService
);

router.post("/login", authenticationController.login);

export default router;
