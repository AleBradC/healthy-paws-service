import * as crypto from "crypto";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import * as dotenv from "dotenv";
import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { AuthenticationRepository } from "./authentication.repository";
import { SafeUserRecord, UserRecord, UserResponse, JwtPayload } from "../../types";
import { hashPassword } from "../../helpers";
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
import { APP_NAME } from "../../core/config/email";

dotenv.config();

// Computed once at module load. Used in validateUser to ensure the "unknown email"
// path always runs a full bcrypt comparison, preventing timing-based enumeration.
const DUMMY_HASH = bcrypt.hashSync("__dummy__", 10);

export class AuthenticationService {
  private authenticationRepository: AuthenticationRepository;

  constructor(authRepository: AuthenticationRepository) {
    this.authenticationRepository = authRepository;
  }

  public generateAccessToken(payload: JwtPayload): string {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new SystemError(SystemErrorMessages.JWT_SECRET_UNDEFINED);
    }

    return jwt.sign(payload, secret, { expiresIn: "1h" });
  }

  public async validateUser(
    email: string,
    password: string
  ): Promise<UserResponse | null> {
    try {
      const user = await this.authenticationRepository.findUserByEmail(email);

      // Always run bcrypt.compare so unknown-email and wrong-password paths
      // take the same wall-clock time, preventing timing-based enumeration.
      const hashToCompare = user ? user.password_hash : DUMMY_HASH;
      const isMatch = await bcrypt.compare(password, hashToCompare);

      if (user && isMatch) {
        return { id: user.id, email: user.email, role: user.role };
      }

      return null;
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
      const user = await this.authenticationRepository.findUserByEmail(email);
      if (!user) {
        // Silently succeed — never reveal whether an email is registered.
        return;
      }

      const resetCode = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await this.authenticationRepository.createResetToken(
        user.id,
        resetCode,
        expiresAt
      );
      await this.sendResetCodeEmail(email, resetCode);
    } catch (err) {
      if (err instanceof ClientError || err instanceof SystemError) {
        throw err;
      }
      throw new SystemError(SystemErrorMessages.DB_TRANSACTION_FAILED, err);
    }
  }

  private async sendResetCodeEmail(
    toEmail: string,
    resetCode: string
  ): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
    } as SMTPTransport.Options);

    const templateParams = { code: resetCode };

    try {
      await transporter.sendMail({
        from: `"${APP_NAME}" <${process.env.MAIL_FROM}>`,
        to: [toEmail],
        subject: getResetEmailSubject(templateParams),
        text: getResetEmailText(templateParams),
        html: getResetEmailHtml(templateParams),
      });
    } catch (err) {
      throw new SystemError(SystemErrorMessages.MAIL_PROVIDER_ERROR, err);
    }
  }

  public async verifyResetCode(email: string, code: string): Promise<boolean> {
    try {
      const user = await this.authenticationRepository.findUserByEmail(email);
      if (!user) {
        return false;
      }

      const token = await this.authenticationRepository.findValidResetToken(
        user.id,
        code
      );
      return !!token;
    } catch (err) {
      if (err instanceof SystemError) throw err;
      throw new SystemError(SystemErrorMessages.DB_QUERY_FAILED, err);
    }
  }

  public async resetPassword(
    email: string,
    code: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.authenticationRepository.findUserByEmail(email);

    // If the email is unknown there can be no valid token — fall through to the
    // same "invalid code" error as a wrong code, so email existence is not revealed.
    const token = user
      ? await this.authenticationRepository.findValidResetToken(user.id, code)
      : null;

    if (!token || !user) {
      throw new ClientError(ClientErrorMessages.INVALID_RESET_CODE, 400);
    }

    const hashedPassword = await hashPassword(newPassword);

    try {
      await this.authenticationRepository.updateUserPassword(
        user.id,
        hashedPassword,
        "" // bcrypt salt is embedded in the hash
      );
      await this.authenticationRepository.markResetTokenUsed(token.id);
    } catch (err) {
      throw new SystemError(SystemErrorMessages.DB_TRANSACTION_FAILED, err);
    }
  }
}
