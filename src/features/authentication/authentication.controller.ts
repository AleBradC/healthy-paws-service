import { NextFunction, Request, Response } from "express";
import passport from "passport";
import { AuthenticationService } from "./authentication.service";
import { UserResponse, ApiResponse } from "../../types";
import { ClientErrorMessages } from "../../errors/constants";
import { ClientError } from "../../errors/ClientError";
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

          const response: ApiResponse<{ accessToken: string; role: string; id: string }> = {
            status: "success",
            message: SuccessMessages.LOGIN_SUCCESS,
            data: {
              accessToken: token,
              role: user.role,
              id: ownerOrDoctorId,
            }
          };
          return res.json(response);
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
      const response: ApiResponse = { status: "success", message: SuccessMessages.RESET_CODE_SENT };
      res.json(response);
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

      const response: ApiResponse = { status: "success", message: SuccessMessages.RESET_CODE_VERIFIED };
      res.json(response);
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
      const response: ApiResponse = { status: "success", message: SuccessMessages.PASSWORD_RESET_SUCCESS };
      res.json(response);
    } catch (error) {
      next(error);
    }
  };
}
