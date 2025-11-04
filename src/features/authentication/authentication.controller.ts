import { NextFunction, Request, Response } from "express";
import { AuthenticationService } from "./authentication.service";
import { passwordResetTokens } from "../../constants";
import passport from "passport";
import { User } from "../../types";

export class AuthenticationController {
  private authenticationService: AuthenticationService;

  constructor(authenticationService: AuthenticationService) {
    this.authenticationService = authenticationService;
  }

  public login = (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
      "local",
      { session: false },
      async (
        err: Error | null,
        user: User | false,
        info: { message: string }
      ) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res
            .status(401)
            .json({ message: info?.message || "Invalid credentials." });
        }

        try {
          let ownerOrDoctorId = user.id;

          if (user.role === "owner") {
            const ownerId =
              await this.authenticationService.findOwnerIdByUserId(user.id);
            if (ownerId) {
              ownerOrDoctorId = ownerId;
            } else {
              return res
                .status(500)
                .json({ message: "User profile not found." });
            }
          }

          const payload = {
            id: ownerOrDoctorId,
            email: user.email,
            role: user.role,
          };
          const token = this.authenticationService.generateAccessToken(payload);

          return res.json({
            message: "Logged in successfully",
            accessToken: token,
            role: user.role,
            id: ownerOrDoctorId,
          });
        } catch (error) {
          return next(error);
        }
      }
    )(req, res, next);
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

    const resultMessage = await this.authenticationService.resetPassword(
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
