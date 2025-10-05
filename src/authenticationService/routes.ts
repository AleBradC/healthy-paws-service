// Defines the API endpoints for registration, login, logout, and protected resources.
import { Router, Request, Response } from "express";
import { passport, authenticationService } from "./passport-config";
import crypto from "crypto";

const router = Router();
const passwordResetTokens: { [token: string]: string } = {};

// Register
router.post("/register", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  const user = await authenticationService.register(email, password);
  if (!user) {
    return res.status(409).json({ message: "Email already exists." });
  }

  res.status(201).json({ message: "User registered successfully." });
});

//Login
router.post(
  "/login",
  passport.authenticate("local"),
  (req: Request, res: Response) => {
    res.json({ message: "Logged in successfully", user: req.user });
  }
);

//Logout
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

router.post("/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  const user = await authenticationService.findUserByEmail(email);
  if (!user) {
    // To prevent email enumeration, you can send a success response even if the user doesn't exist.
    return res.json({
      message:
        "If a user with that email exists, a password reset link has been sent.",
    });
  }

  const token = crypto.randomBytes(32).toString("hex");
  passwordResetTokens[token] = user.id;

  // In a real application, you would send an email here.
  console.log(`Password reset token for ${email}: ${token}`);
  // TODO: Implement an email service to send the token to the user.

  res.json({
    message:
      "If a user with that email exists, a password reset link has been sent.",
  });
});

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

  const success = await authenticationService.resetPassword(
    userId,
    newPassword
  );

  if (success) {
    // Invalidate the token after use
    delete passwordResetTokens[token];
    res.json({ message: "Password has been reset successfully." });
  } else {
    res
      .status(500)
      .json({ message: "An error occurred while resetting the password." });
  }
});

export default router;
