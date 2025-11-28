import * as crypto from "crypto";
import * as jwt from "jsonwebtoken";
import * as dotenv from "dotenv";
import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { AuthenticationRepository } from "./authentication.repository";
import { UserRecord, UserResponse, JwtPayload } from "../../types";
import { hashPassword } from "../../helpers";
import { ErrorMessages } from "../../constants";
import { getEmailTemplate } from "../../email-template";

dotenv.config();

export class AuthenticationService {
  private authenticationRepository: AuthenticationRepository;

  constructor(authRepository: AuthenticationRepository) {
    this.authenticationRepository = authRepository;
  }

  public generateAccessToken(payload: JwtPayload): string {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error(ErrorMessages.JWT_SECRET_UNDEFINED);
    }

    return jwt.sign(payload, secret, { expiresIn: "1h" });
  }

  public async validateUser(
    email: string,
    password: string
  ): Promise<UserResponse | null> {
    const user = await this.authenticationRepository.findUserByEmail(email);

    if (!user) {
      return null;
    }

    const calculatedHash = hashPassword(password, user.password_salt);

    if (calculatedHash === user.password_hash) {
      return { id: user.id, email: user.email, role: user.role };
    }

    return null;
  }

  public async findUserById(id: string): Promise<UserRecord | null> {
    return this.authenticationRepository.findUserById(id);
  }

  public async findOwnerIdByUserId(userId: string): Promise<string | null> {
    return this.authenticationRepository.findOwnerIdByUserId(userId);
  }

  public async findDoctorIdByUserId(userId: string): Promise<string | null> {
    return this.authenticationRepository.findDoctorIdByUserId(userId);
  }

  public async startPasswordReset(email: string): Promise<void> {
    const user = await this.authenticationRepository.findUserByEmail(email);

    if (!user) {
      throw new Error("Email not found");
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.authenticationRepository.createResetToken(
      user.id,
      resetCode,
      expiresAt
    );

    await this.sendResetCodeEmail(email, resetCode);
  }

  private async sendResetCodeEmail(
    toEmail: string,
    resetCode: string
  ): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
    } as SMTPTransport.Options);

    const emailHtml = getEmailTemplate(resetCode);

    try {
      await transporter.sendMail({
        from: `"Healthy Paws Clinic" <${process.env.MAIL_FROM}>`,
        to: [toEmail],
        subject: `Your Verification Code: ${resetCode} - Healthy Paws`,
        text: `Your Healthy Paws reset code is: ${resetCode}`,
        html: emailHtml,
      });
    } catch (err) {
      console.error("Error while sending mail", err);
    }
  }

  public async verifyResetCode(email: string, code: string): Promise<boolean> {
    const user = await this.authenticationRepository.findUserByEmail(email);

    if (!user) {
      return false;
    }

    const token = await this.authenticationRepository.findValidResetToken(
      user.id,
      code
    );
    return !!token;
  }

  public async resetPassword(
    email: string,
    code: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.authenticationRepository.findUserByEmail(email);
    if (!user) {
      throw new Error("Email not found");
    }

    const token = await this.authenticationRepository.findValidResetToken(
      user.id,
      code
    );

    if (!token) {
      throw new Error("Invalid or expired reset code");
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const hashedPassword = hashPassword(newPassword, salt);

    await this.authenticationRepository.updateUserPassword(
      user.id,
      hashedPassword,
      salt
    );
    await this.authenticationRepository.markResetTokenUsed(token.id);
  }
}
