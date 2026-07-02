import * as crypto from "crypto";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import { AuthenticationRepository } from "./authentication.repository";

import {
  getResetEmailHtml,
  getResetEmailSubject,
  getResetEmailText,
} from "../../email-template";
import {
  ClientErrorMessages,
  SystemErrorMessages,
} from "../../errors/constants";
import { ClientError } from "../../errors/ClientError";
import { SystemError } from "../../errors/SystemError";
import { PASSWORD_RESET_EXPIRES_MINUTES } from "../../core/config/email";
import { JWT_CONFIG } from "../../core/config/jwt";
import { APP_CONFIG } from "../../core/config/app";
import { sendMail } from "../../core/mailer";
import { hashPassword } from "../../core/utils/helpers";
import { UserResponse, SafeUserRecord } from "../../core/utils/types";

const DUMMY_HASH = bcrypt.hashSync("__dummy__", 12);

export type ValidateUserResult =
  | { status: "ok"; user: UserResponse }
  | { status: "invalid-credentials" };

export class AuthenticationService {
  private authenticationRepository: AuthenticationRepository;

  constructor(authRepository: AuthenticationRepository) {
    this.authenticationRepository = authRepository;
  }

  public generateAccessToken(payload: jwt.JwtPayload): {
    token: string;
    expiresAtMs: number;
  } {
    const token = jwt.sign(payload, JWT_CONFIG.secret, {
      expiresIn: JWT_CONFIG.expiresIn,
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
    });
    const decoded = jwt.decode(token) as { exp?: number } | null;
    if (!decoded?.exp) {
      throw new SystemError(SystemErrorMessages.JWT_SIGN_FAILED);
    }
    return { token, expiresAtMs: decoded.exp * 1000 };
  }

  public async validateUser(
    email: string,
    password: string,
  ): Promise<ValidateUserResult> {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const user =
        await this.authenticationRepository.findUserByEmail(normalizedEmail);

      const hashToCompare = user ? user.password_hash : DUMMY_HASH;
      const isMatch = await bcrypt.compare(password, hashToCompare);

      if (!user || !isMatch) {
        return { status: "invalid-credentials" };
      }

      return {
        status: "ok",
        user: { id: user.id, email: user.email, role: user.role },
      };
    } catch (err) {
      throw new SystemError(SystemErrorMessages.DB_QUERY_FAILED, err);
    }
  }

  public async findUserById(id: string): Promise<SafeUserRecord | null> {
    try {
      return await this.authenticationRepository.findUserById(id);
    } catch (err) {
      throw new SystemError(SystemErrorMessages.DB_QUERY_FAILED, err);
    }
  }

  public async startPasswordReset(email: string): Promise<void> {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const user =
        await this.authenticationRepository.findUserByEmail(normalizedEmail);
      if (!user) {
        return;
      }

      const rawToken = crypto.randomBytes(32).toString("base64url");
      const tokenHash = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");
      const expiresAt = new Date(
        Date.now() + PASSWORD_RESET_EXPIRES_MINUTES * 60 * 1000,
      );

      await this.authenticationRepository.invalidatePreviousTokens(user.id);
      await this.authenticationRepository.createResetToken(
        user.id,
        tokenHash,
        expiresAt,
      );

      const resetUrl = `${APP_CONFIG.frontendUrl}/auth/reset-password?token=${rawToken}`;
      await this.sendResetLinkEmail(normalizedEmail, resetUrl);
    } catch (err) {
      if (err instanceof ClientError || err instanceof SystemError) {
        throw err;
      }
      throw new SystemError(SystemErrorMessages.DB_TRANSACTION_FAILED, err);
    }
  }

  private async sendResetLinkEmail(
    toEmail: string,
    resetUrl: string,
  ): Promise<void> {
    const templateParams = {
      resetUrl,
      expiresInMinutes: PASSWORD_RESET_EXPIRES_MINUTES,
    };

    try {
      await sendMail({
        to: toEmail,
        subject: getResetEmailSubject(),
        text: getResetEmailText(templateParams),
        html: getResetEmailHtml(templateParams),
      });
    } catch (err) {
      throw new SystemError(SystemErrorMessages.MAIL_PROVIDER_ERROR, err);
    }
  }

  public async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<string> {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const row =
      await this.authenticationRepository.findValidResetToken(tokenHash);

    if (!row) {
      throw new ClientError(ClientErrorMessages.INVALID_RESET_TOKEN, 400);
    }

    const hashedPassword = await hashPassword(newPassword);

    try {
      await this.authenticationRepository.updateUserPassword(
        row.user_id,
        hashedPassword,
      );
      await this.authenticationRepository.markResetTokenUsed(row.id);
      return row.user_id;
    } catch (err) {
      throw new SystemError(SystemErrorMessages.DB_TRANSACTION_FAILED, err);
    }
  }
}
