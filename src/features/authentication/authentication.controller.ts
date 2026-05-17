import { NextFunction, Request, Response, CookieOptions } from "express";
import passport from "passport";
import { AuthenticationService } from "./authentication.service";
import { JwtPayload, UserResponse, ApiResponse } from "../../types";
import {
  ClientErrorMessages,
  SuccessMessages,
} from "../../errors/constants";
import { ClientError } from "../../errors/ClientError";
import {requestResetSchema, resetSchema} from "./authentication.helpers";

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
    passport.authenticate(
      "local",
      { session: false },
      async (err: Error | null, user: UserResponse | false) => {
        if (err) {
          return next(err);
        }

        if (!user) {
          // Single fixed message — never pass through strategy-supplied strings,
          // to avoid leaking richer states (account locked, internal errors, etc.)
          // to the client.
          return next(
            new ClientError(ClientErrorMessages.INVALID_CREDENTIALS, 401)
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

          // Cookie lifetime is derived from the JWT's own exp claim so the
          // two cannot drift if JWT_EXPIRES_IN is changed.
          res.cookie("accessToken", token, {
            ...ACCESS_COOKIE_BASE_OPTIONS,
            maxAge: Math.max(0, expiresAtMs - Date.now()),
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
      const parsed = requestResetSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ClientError(ClientErrorMessages.EMAIL_REQUIRED, 400);
      }

      await this.authenticationService.startPasswordReset(parsed.data.email);
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
    next: NextFunction
  ) => {
    try {
      const parsed = resetSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ClientError(ClientErrorMessages.NEW_PASSWORD_REQUIRED, 400);
      }

      await this.authenticationService.resetPassword(
        parsed.data.token,
        parsed.data.newPassword
      );
      const response: ApiResponse = {
        status: "success",
        message: SuccessMessages.PASSWORD_RESET_SUCCESS,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  public logout = (_req: Request, res: Response): void => {
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
