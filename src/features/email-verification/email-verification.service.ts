import * as crypto from "crypto";
import { EmailVerificationRepository } from "./email-verification.repository";
import { ClientError } from "../../errors/ClientError";
import { SystemError } from "../../errors/SystemError";
import {
  ClientErrorMessages,
  SystemErrorMessages,
} from "../../errors/constants";
import {
  getVerificationEmailHtml,
  getVerificationEmailSubject,
  getVerificationEmailText,
} from "../../email-template";
import { EMAIL_VERIFICATION_EXPIRES_HOURS } from "../../core/config/email";
import { APP_CONFIG } from "../../core/config/app";
import { sendMail } from "../../core/mailer";

// Mirrors PasswordResetTokens semantics: random 32-byte token, persist only
// the SHA-256 hex digest, 24h expiry by default. Raw token leaves the system
// once, in the verification email.
//
// The class is split into two public methods plus a private send helper:
//   - issueAndSendForNewUser: called from registration, no rate limit needed
//     because registration itself is rate-limited
//   - resendForUnverifiedEmail: called from the public /resend endpoint;
//     enumeration-safe (silently no-ops for unknown or already-verified emails)
//   - verify: consumes a raw token, marks the user verified

export class EmailVerificationService {
  constructor(
    private readonly repo: EmailVerificationRepository
  ) {}

  public async issueAndSendForNewUser(
    userId: string,
    email: string
  ): Promise<void> {
    const rawToken = this.generateToken();
    const tokenHash = this.hash(rawToken);
    const expiresAt = this.expiryFromNow();

    try {
      await this.repo.invalidatePreviousTokens(userId);
      await this.repo.createToken(userId, tokenHash, expiresAt);
    } catch (err) {
      throw new SystemError(SystemErrorMessages.DB_TRANSACTION_FAILED, err);
    }

    await this.sendVerificationEmail(email, rawToken);
  }

  public async resendForUnverifiedEmail(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    const userId = await this.repo.findUnverifiedUserIdByEmail(normalized);
    if (!userId) {
      // Silently succeed for unknown OR already-verified emails — the
      // public response is identical to a successful resend so we don't
      // leak account state.
      return;
    }

    const rawToken = this.generateToken();
    const tokenHash = this.hash(rawToken);
    const expiresAt = this.expiryFromNow();

    try {
      await this.repo.invalidatePreviousTokens(userId);
      await this.repo.createToken(userId, tokenHash, expiresAt);
    } catch (err) {
      throw new SystemError(SystemErrorMessages.DB_TRANSACTION_FAILED, err);
    }

    await this.sendVerificationEmail(normalized, rawToken);
  }

  public async verify(rawToken: string): Promise<string> {
    if (!rawToken || typeof rawToken !== "string") {
      throw new ClientError(ClientErrorMessages.INVALID_VERIFICATION_TOKEN, 400);
    }

    const tokenHash = this.hash(rawToken);
    const row = await this.repo.findValidToken(tokenHash);
    if (!row) {
      throw new ClientError(ClientErrorMessages.INVALID_VERIFICATION_TOKEN, 400);
    }

    try {
      await this.repo.markVerifiedAndConsumeToken(row.user_id, row.id);
      return row.user_id;
    } catch (err) {
      throw new SystemError(SystemErrorMessages.DB_TRANSACTION_FAILED, err);
    }
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString("base64url");
  }

  private hash(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  private expiryFromNow(): Date {
    return new Date(
      Date.now() + EMAIL_VERIFICATION_EXPIRES_HOURS * 60 * 60 * 1000
    );
  }

  private async sendVerificationEmail(
    toEmail: string,
    rawToken: string
  ): Promise<void> {
    const verifyUrl = `${APP_CONFIG.frontendUrl}/auth/verify-email?token=${rawToken}`;
    const params = {
      verifyUrl,
      expiresInHours: EMAIL_VERIFICATION_EXPIRES_HOURS,
    };

    try {
      await sendMail({
        to: toEmail,
        subject: getVerificationEmailSubject(),
        text: getVerificationEmailText(params),
        html: getVerificationEmailHtml(params),
      });
    } catch (err) {
      throw new SystemError(SystemErrorMessages.MAIL_PROVIDER_ERROR, err);
    }
  }
}
