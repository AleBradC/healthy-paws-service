// Defines the API endpoints for registration, login, logout, and protected resources.
import { Router, Request, Response } from "express";
import { passport } from "./passport-config";
import { AuthenticationService } from "./auth-service"; // Import the class
import pool from "../db"; // Import the database pool
import crypto from "crypto";

const router = Router();

// Create an instance of the service, passing in the database pool
const authenticationService = new AuthenticationService(pool);

const passwordResetTokens: { [token: string]: string } = {};

// Register
router.post("/register", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  // Use the service instance created above
  const user = await authenticationService.register(email, password);
  if (!user) {
    return res.status(409).json({ message: "Email already exists." });
  }

  res.status(201).json({ message: "User registered successfully." });
});

// Login
router.post(
  "/login",
  passport.authenticate("local"),
  (req: Request, res: Response) => {
    res.json({ message: "Logged in successfully", user: req.user });
  }
);

// Logout
router.post("/logout", (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: "Error logging out" });
    }
    res.json({ message: "Logged out successfully" });
  });
});

// Protected profile route
router.get("/profile", (req: Request, res: Response) => {
  if (req.isAuthenticated()) {
    return res.json({ user: req.user });
  }
  res.status(401).json({ message: "Unauthorized" });
});

// Forgot Password
router.post("/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  // Use the service instance
  const user = await authenticationService.findUserByEmail(email);
  if (!user) {
    return res.json({
      message:
        "If a user with that email exists, a password reset link has been sent.",
    });
  }

  const token = crypto.randomBytes(32).toString("hex");
  passwordResetTokens[token] = user.id;

  console.log(`Password reset token for ${email}: ${token}`);

  res.json({
    message:
      "If a user with that email exists, a password reset link has been sent.",
  });
});

// Reset Password
router.post("/reset-password/:token", async (req: Request, res: Response) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  const userId = passwordResetTokens[token];
  if (!userId) {
    return res.status(400).json({ message: "Invalid or expired token." });
  }

  if (!newPassword) {
    return res.status(400).json({ message: "New password is required." });
  }

  // Use the service instance
  const success = await authenticationService.resetPassword(
    userId,
    newPassword
  );

  if (success) {
    delete passwordResetTokens[token];
    res.json({ message: "Password has been reset successfully." });
  } else {
    res
      .status(500)
      .json({ message: "An error occurred while resetting the password." });
  }
});

export default router;
