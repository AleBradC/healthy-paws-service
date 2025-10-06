import { Router } from "express";
import { passport } from "../../core/middleware/passport-config";
import { AuthRepository } from "./auth.repository";
import { AuthenticationService } from "./auth.service";
import { AuthController } from "./auth.controller";
import pool from "../../core/config/db";

const router = Router();

const authRepository = new AuthRepository(pool);
const authService = new AuthenticationService(authRepository);
const authController = new AuthController(authService);

router.post("/register", authController.register);
router.post("/login", passport.authenticate("local"), authController.login);
router.post("/logout", authController.logout);
router.post("/reset-password/:token", authController.resetPassword);

export default router;
