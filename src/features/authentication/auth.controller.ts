import { Request, Response } from "express";
import { AuthenticationService } from "./auth.service";
import { RegisterPayload } from "./types"; // Use the main payload type

const passwordResetTokens: {
  [token: string]: { userId: string; expires: number };
} = {};

export class AuthController {
  private authService: AuthenticationService;

  constructor(authService: AuthenticationService) {
    this.authService = authService;
  }

  public register = async (req: Request, res: Response) => {
    const { owner, animal } = req.body as RegisterPayload;

    if (!owner || !owner.name || !owner.email || !owner.password) {
      return res
        .status(400)
        .json({ message: "Owner details are missing or incomplete." });
    }
    if (!animal || !animal.name) {
      return res
        .status(400)
        .json({ message: "Animal details are missing or incomplete." });
    }

    const payload: RegisterPayload = {
      owner: {
        ...owner,
      },
      animal: {
        ...animal,
        age: Number(animal.age),
        weight: Number(animal.weight),
      },
    };

    try {
      const newOwner = await this.authService.register(payload);

      if (!newOwner) {
        return res.status(409).json({ message: "Email already exists." });
      }

      res.status(201).json({
        message: "User and pet registered successfully.",
        owner: newOwner,
      });
    } catch (error) {
      console.error("Registration Error:", error);
      res.status(500).json({ message: "An internal server error occurred." });
    }
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

    const resultMessage = await this.authService.resetPassword(
      tokenData.userId,
      newPassword
    );

    if (resultMessage === "Password was changed") {
      delete passwordResetTokens[token];
      return res
        .status(200)
        .json({ message: "Password has been reset successfully." });
    } else {
      return res.status(404).json({ message: "User not found." });
    }
  };
}
