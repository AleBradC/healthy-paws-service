import { NextFunction, Request, Response } from "express";
import passport from "passport";
import { AuthenticationService } from "./authentication.service";
import { JwtPayload, UserResponse, ApiResponse } from "../../types";
import { ClientErrorMessages } from "../../errors/constants";
import { ClientError } from "../../errors/ClientError";
import { SuccessMessages } from "../../constants";

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
          const payload: JwtPayload = {
            id: user.id,
            email: user.email,
            role: user.role,
          };
          const token = this.authenticationService.generateAccessToken(payload);

          // Store the JWT in an httpOnly cookie — inaccessible to JavaScript,
          // eliminating the XSS token-theft vector.
          res.cookie("accessToken", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 60 * 60 * 1000, // 1 hour — matches JWT expiresIn
            path: "/",
          });

          const response: ApiResponse<{ role: string; id: string }> = {
            status: "success",
            message: SuccessMessages.LOGIN_SUCCESS,
            data: { role: user.role, id: user.id },
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

  public logout = (_req: Request, res: Response): void => {
    res.clearCookie("accessToken", { path: "/" });
    res.json({ status: "success", message: "Logged out." });
  };

  public session = (req: Request, res: Response): void => {
    if (!req.user) {
      res.status(401).json({ status: "error", message: "Unauthorised." });
      return;
    }
    res.json({ status: "success", data: req.user });
  };
}
