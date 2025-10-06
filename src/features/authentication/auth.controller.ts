import { Request, Response } from "express";
import { AuthenticationService } from "./auth.service";

const passwordResetTokens: {
  [token: string]: { userId: string; expires: number };
} = {};

export class AuthController {
  private authService: AuthenticationService;

  constructor(authService: AuthenticationService) {
    this.authService = authService;
  }

  public register = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const user = await this.authService.register(email, password);
    if (!user) {
      return res.status(409).json({ message: "Email already exists." });
    }

    res.status(201).json({ message: "User registered successfully." });
  };

  public login = (req: Request, res: Response) => {
    res.status(200).json({ message: "Logged in successfully", user: req.user });
  };

  public logout = (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Error logging out." });
      }
      res.status(200).json({ message: "Logged out successfully." });
    });
  };

  public resetPassword = async (req: Request, res: Response) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    const tokenData = passwordResetTokens[token];

    if (!tokenData || tokenData.expires < Date.now()) {
      return res
        .status(400)
        .json({ message: "Token is invalid or has expired." });
    }

    if (!newPassword) {
      return res.status(400).json({ message: "New password is required." });
    }

    const success = await this.authService.resetPassword(
      tokenData.userId,
      newPassword
    );

    if (success) {
      delete passwordResetTokens[token];
      return res
        .status(200)
        .json({ message: "Password has been reset successfully." });
    } else {
      return res.status(404).json({ message: "User not found." });
    }
  };
}
