// Defines the API endpoints for registration, login, logout, and protected resources.
import { Router, Request, Response } from "express";
import { passport, authenticationService } from "./passport-config";

const router = Router();

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

export default router;
