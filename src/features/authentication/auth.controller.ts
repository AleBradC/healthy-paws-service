import { NextFunction, Request, Response } from "express";
import { AuthenticationService } from "./auth.service";
import { RegisterDoctorPayload, RegisterOwnerPayload } from "./types";
import { ROLES } from "./constants";
import passport from "passport";

interface User {
  id: string;
  email: string;
  role: "doctor" | "owner";
}

const passwordResetTokens: {
  [token: string]: { userId: string; expires: number };
} = {};

export class AuthController {
  private authService: AuthenticationService;

  constructor(authService: AuthenticationService) {
    this.authService = authService;
  }

  public register = async (req: Request, res: Response) => {
    const { role, owner, animal, doctor } = req.body;

    try {
      if (role === ROLES.OWNER_ROLE) {
        if (!owner || !animal) {
          return res
            .status(400)
            .json({ message: "Owner and animal details are required." });
        }
        const payload: RegisterOwnerPayload = { owner, animal };
        const newOwner = await this.authService.registerOwner(payload);
        return res.status(201).json({
          message: "Pet owner registered successfully.",
          user: newOwner,
        });
      } else if (role === ROLES.DOCTOR_ROLE) {
        if (!doctor) {
          return res
            .status(400)
            .json({ message: "Doctor details are required." });
        }
        const payload: RegisterDoctorPayload = { doctor };
        const newDoctor = await this.authService.registerDoctor(payload);
        return res.status(201).json({
          message: "Doctor registered successfully.",
          user: newDoctor,
        });
      } else {
        return res.status(400).json({
          message: "A valid role ('owner' or 'doctor') must be specified.",
        });
      }
    } catch (error: any) {
      if (error.message.includes("already exists")) {
        return res
          .status(409)
          .json({ message: "An account with this email already exists." });
      }
      console.error("Registration Error:", error);
      res.status(500).json({ message: "An internal server error occurred." });
    }
  };

  public login = (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
      "local",
      { session: false },
      (err: Error | null, user: User | false, info: { message: string }) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res
            .status(401)
            .json({ message: info?.message || "Invalid credentials." });
        }

        const payload = { id: user.id, email: user.email, role: user.role };
        const token = this.authService.generateAccessToken(payload);

        return res.json({
          message: "Logged in successfully",
          accessToken: token,
          user: payload,
        });
      }
    )(req, res, next);
  };

  public logout = (req: Request, res: Response) => {
    res.status(200).json({ message: "Logged out successfully." });
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
