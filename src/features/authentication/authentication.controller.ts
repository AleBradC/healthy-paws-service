import { NextFunction, Request, Response } from "express";
import passport from "passport";
import { AuthenticationService } from "./authentication.service";
import { UserResponse } from "../../types";

export class AuthenticationController {
  private authenticationService: AuthenticationService;

  constructor(authenticationService: AuthenticationService) {
    this.authenticationService = authenticationService;
  }

  public login = (req: Request, res: Response, next: NextFunction): void => {
    passport.authenticate(
      "local",
      { session: false },
      async (
        err: Error | null,
        user: UserResponse | false,
        info: { message?: string }
      ) => {
        if (err) return next(err);

        if (!user) {
          return res
            .status(401)
            .json({ message: info?.message || "Invalid credentials." });
        }

        try {
          let ownerOrDoctorId: string = user.id;

          if (user.role === "owner") {
            const ownerId =
              await this.authenticationService.findOwnerIdByUserId(user.id);
            if (ownerId) {
              ownerOrDoctorId = ownerId;
            } else {
              return res
                .status(500)
                .json({ message: "Owner profile not found." });
            }
          } else if (user.role === "doctor") {
            const doctorId =
              await this.authenticationService.findDoctorIdByUserId(user.id);
            if (doctorId) {
              ownerOrDoctorId = doctorId;
            } else {
              return res
                .status(500)
                .json({ message: "Doctor profile not found." });
            }
          }

          const payload: UserResponse = {
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
}
