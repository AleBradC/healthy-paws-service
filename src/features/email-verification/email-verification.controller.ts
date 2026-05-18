import { Request, Response, NextFunction } from "express";
import { EmailVerificationService } from "./email-verification.service";
import {
  verifyEmailSchema,
  resendVerificationSchema,
} from "./email-verification.helpers";
import { ApiResponse } from "../../types";
import {
  ClientErrorMessages,
  SuccessMessages,
} from "../../errors/constants";
import { ClientError } from "../../errors/ClientError";
import { auditService, AuditAction } from "../audit";

export class EmailVerificationController {
  constructor(private readonly service: EmailVerificationService) {}

  // POST /api/auth/verify-email — body { token }. 200 on success, 400 on
  // bad/expired token. Idempotent within an already-verified window: once
  // consumed the token is rejected on replay (used_at IS NOT NULL).
  public verify = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const parsed = verifyEmailSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ClientError(
          ClientErrorMessages.INVALID_VERIFICATION_TOKEN,
          400
        );
      }

      const userId = await this.service.verify(parsed.data.token);

      auditService.record({
        action: AuditAction.EmailVerificationCompleted,
        outcome: "success",
        actorUserId: userId,
        targetUserId: userId,
        ip: req.auditContext?.ip ?? null,
        userAgent: req.auditContext?.userAgent ?? null,
      });

      const response: ApiResponse = {
        status: "success",
        message: SuccessMessages.EMAIL_VERIFIED,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  // POST /api/auth/resend-verification — body { email }. Always 200 with
  // the same generic message regardless of whether the email exists or is
  // already verified. The rate limiter (caller-applied) is the brake on abuse.
  public resend = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const parsed = resendVerificationSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ClientError(ClientErrorMessages.EMAIL_REQUIRED, 400);
      }

      await this.service.resendForUnverifiedEmail(parsed.data.email);

      auditService.record({
        action: AuditAction.EmailVerificationRequested,
        outcome: "success",
        ip: req.auditContext?.ip ?? null,
        userAgent: req.auditContext?.userAgent ?? null,
        metadata: { attemptedEmail: parsed.data.email.trim().toLowerCase() },
      });

      const response: ApiResponse = {
        status: "success",
        message: SuccessMessages.VERIFICATION_LINK_SENT,
      };
      res.json(response);
    } catch (error) {
      next(error);
    }
  };
}
