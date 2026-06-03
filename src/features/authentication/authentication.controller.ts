import { NextFunction, Request, Response, CookieOptions } from "express";
import passport from "passport";
import { AuthenticationService } from "./authentication.service";

import { ClientErrorMessages, SuccessMessages } from "../../errors/constants";
import { ClientError } from "../../errors/ClientError";
import { requestResetSchema, resetSchema } from "./authentication.helpers";
import { auditService, AuditAction } from "../audit";
import { ApiResponse, JwtPayload, UserResponse } from "../../core/utils/types";

// Shared cookie options for the access-token cookie.
// httpOnly: cookie is invisible to JS, eliminating the XSS token-theft vector.
// sameSite=strict: cookie is never sent on cross-site requests, providing
// built-in CSRF protection for state-changing requests.
// secure: only set in production so dev (http) still works.
// All of these MUST match on clearCookie or some browsers ignore the clear.
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
    // Captured here so we can log it on the failure path. Passport doesn't
    // pass the original request body through to the verify callback in a
    // shape that survives error branches.
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
            // The attempted email is logged so we can correlate brute-force
            // patterns. We never log the attempted password.
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

      // Logged on every request (even for unknown emails) so we can detect
      // enumeration scans. Storing the attempted email is OK here — the
      // public response is intentionally enumeration-safe; the AUDIT row is
      // for internal forensics, not for the requester.
      auditService.record({
        action: AuditAction.PasswordResetRequested,
        outcome: "success",
        ip: req.auditContext?.ip ?? null,
        userAgent: req.auditContext?.userAgent ?? null,
        metadata: { attemptedEmail: parsed.data.email.trim().toLowerCase() },
      });

      // Always 200 with the same generic message — privacy-preserving so the
      // response shape doesn't leak whether the email is registered.
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
    // Capture identity before clearing the cookie — req.user is unset if the
    // request had no valid token, but we still log the attempt either way.
    const user = req.user as UserResponse | undefined;
    auditService.record({
      action: AuditAction.Logout,
      outcome: "success",
      actorUserId: user?.id ?? null,
      actorRole: user?.role ?? null,
      ip: req.auditContext?.ip ?? null,
      userAgent: req.auditContext?.userAgent ?? null,
    });

    // Must pass the same attributes used when setting the cookie, otherwise
    // some browsers refuse to clear it.
    res.clearCookie("accessToken", ACCESS_COOKIE_BASE_OPTIONS);
    res.json({ status: "success", message: "Logged out." });
  };

  // GET /api/auth/session — state-inquiry endpoint. Always 200; the body's
  // `data` is the user when there's a valid session and null otherwise.
  // Keeps DevTools clean on cold boot and lets the client treat
  // logged-in/logged-out as the same code path.
  public session = (req: Request, res: Response): void => {
    const response: ApiResponse<UserResponse | null> = {
      status: "success",
      data: (req.user as UserResponse | undefined) ?? null,
    };
    res.json(response);
  };
}
