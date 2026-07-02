import { NextFunction, Request, Response, CookieOptions } from "express";
import passport from "passport";
import { AuthenticationService } from "./authentication.service";

import { ClientErrorMessages, SuccessMessages } from "../../errors/constants";
import { ClientError } from "../../errors/ClientError";
import { requestResetSchema, resetSchema } from "./authentication.helpers";
import { auditService, AuditAction } from "../audit";
import { ApiResponse, JwtPayload, UserResponse } from "../../core/utils/types";

const ACCESS_COOKIE_BASE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
};

export class AuthenticationController {
  private authenticationService: AuthenticationService;

  constructor(authenticationService: AuthenticationService) {
    this.authenticationService = authenticationService;
  }

  public login = (req: Request, res: Response, next: NextFunction): void => {
    const attemptedEmail =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : null;
    const ip = req.auditContext?.ip ?? null;
    const userAgent = req.auditContext?.userAgent ?? null;

    type LoginInfo = { reason: "invalid" } | undefined;

    passport.authenticate(
      "local",
      { session: false },
      async (
        err: Error | null,
        user: UserResponse | false,
        info: LoginInfo,
      ) => {
        if (err) {
          return next(err);
        }

        if (!user) {
          auditService.record({
            action: AuditAction.LoginFailure,
            outcome: "failure",
            ip,
            userAgent,
            metadata: { attemptedEmail },
          });
          return next(
            new ClientError(ClientErrorMessages.INVALID_CREDENTIALS, 401),
          );
        }

        try {
          const payload: JwtPayload = {
            id: user.id,
            email: user.email,
            role: user.role,
          };
          const { token, expiresAtMs } =
            this.authenticationService.generateAccessToken(payload);

          res.cookie("accessToken", token, {
            ...ACCESS_COOKIE_BASE_OPTIONS,
            maxAge: Math.max(0, expiresAtMs - Date.now()),
          });

          auditService.record({
            action: AuditAction.LoginSuccess,
            outcome: "success",
            actorUserId: user.id,
            actorRole: user.role,
            ip,
            userAgent,
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
      },
    )(req, res, next);
  };

  public startPasswordReset = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const parsed = requestResetSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ClientError(ClientErrorMessages.EMAIL_REQUIRED, 400);
      }

      await this.authenticationService.startPasswordReset(parsed.data.email);

      auditService.record({
        action: AuditAction.PasswordResetRequested,
        outcome: "success",
        ip: req.auditContext?.ip ?? null,
        userAgent: req.auditContext?.userAgent ?? null,
        metadata: { attemptedEmail: parsed.data.email.trim().toLowerCase() },
      });

      const response: ApiResponse = {
        status: "success",
        message: SuccessMessages.RESET_LINK_SENT,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public resetPassword = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const parsed = resetSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ClientError(ClientErrorMessages.NEW_PASSWORD_REQUIRED, 400);
      }

      const userId = await this.authenticationService.resetPassword(
        parsed.data.token,
        parsed.data.newPassword,
      );

      auditService.record({
        action: AuditAction.PasswordResetCompleted,
        outcome: "success",
        actorUserId: userId,
        targetUserId: userId,
        ip: req.auditContext?.ip ?? null,
        userAgent: req.auditContext?.userAgent ?? null,
      });

      const response: ApiResponse = {
        status: "success",
        message: SuccessMessages.PASSWORD_RESET_SUCCESS,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public logout = (req: Request, res: Response): void => {
    const user = req.user as UserResponse | undefined;
    auditService.record({
      action: AuditAction.Logout,
      outcome: "success",
      actorUserId: user?.id ?? null,
      actorRole: user?.role ?? null,
      ip: req.auditContext?.ip ?? null,
      userAgent: req.auditContext?.userAgent ?? null,
    });

    res.clearCookie("accessToken", ACCESS_COOKIE_BASE_OPTIONS);
    res.json({ status: "success", message: "Logged out." });
  };

  public session = (req: Request, res: Response): void => {
    const response: ApiResponse<UserResponse | null> = {
      status: "success",
      data: (req.user as UserResponse | undefined) ?? null,
    };
    res.json(response);
  };
}
