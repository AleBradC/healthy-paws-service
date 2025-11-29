import { NextFunction, Request, Response } from "express";
import passport from "passport";
import { AuthenticationService } from "./authentication.service";
import { UserResponse } from "../../types";
import { ClientErrorMessages } from "../../errors.ts/constants";
import { ClientError } from "../../errors.ts/AppError";
import { ROLES, SuccessMessages } from "../../constants";

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
        if (err) {
          return next(err);
        }

        if (!user) {
          return next(
            new ClientError(
              info?.message || ClientErrorMessages.INVALID_CREDENTIALS,
              401
            )
          );
        }

        try {
          let ownerOrDoctorId: string = user.id;

          if (user.role === ROLES.OWNER_ROLE) {
            const ownerId =
              await this.authenticationService.findOwnerIdByUserId(user.id);
            if (ownerId) {
              ownerOrDoctorId = ownerId;
            } else {
              throw new ClientError(
                ClientErrorMessages.OWNER_PROFILE_NOT_FOUND,
                404
              );
            }
          } else if (user.role === ROLES.DOCTOR_ROLE) {
            const doctorId =
              await this.authenticationService.findDoctorIdByUserId(user.id);
            if (doctorId) {
              ownerOrDoctorId = doctorId;
            } else {
              throw new ClientError(
                ClientErrorMessages.DOCTOR_PROFILE_NOT_FOUND,
                404
              );
            }
          }

          const payload: UserResponse = {
            id: ownerOrDoctorId,
            email: user.email,
            role: user.role,
          };
          const token = this.authenticationService.generateAccessToken(payload);

          return res.json({
            message: SuccessMessages.LOGIN_SUCCESS,
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

  public startPasswordReset = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email } = req.body;
      if (!email) {
        throw new ClientError(ClientErrorMessages.EMAIL_REQUIRED, 400);
      }

      await this.authenticationService.startPasswordReset(email);
      res.json({ message: SuccessMessages.RESET_CODE_SENT });
    } catch (error) {
      next(error);
    }
  };

  public verifyResetCode = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email, code } = req.body;
      const isValid = await this.authenticationService.verifyResetCode(
        email,
        code
      );

      if (!isValid) {
        throw new ClientError(ClientErrorMessages.INVALID_RESET_CODE, 400);
      }

      res.json({ message: SuccessMessages.RESET_CODE_VERIFIED });
    } catch (error) {
      next(error);
    }
  };

  public resetPassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email, code, newPassword } = req.body;

      if (!newPassword) {
        throw new ClientError(ClientErrorMessages.NEW_PASSWORD_REQUIRED, 400);
      }

      await this.authenticationService.resetPassword(email, code, newPassword);
      res.json({ message: SuccessMessages.PASSWORD_RESET_SUCCESS });
    } catch (error) {
      next(error);
    }
  };
}
