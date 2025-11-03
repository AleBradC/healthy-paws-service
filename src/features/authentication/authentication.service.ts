import * as crypto from "crypto";
import * as jwt from "jsonwebtoken";
import { AuthenticationRepository } from "./authentication.repository";
import { UserRecord } from "../../types";
import { hashPassword } from "../../helpers";

export class AuthenticationService {
  private authenticationRepository: AuthenticationRepository;

  constructor(authRepository: AuthenticationRepository) {
    this.authenticationRepository = authRepository;
  }

  public generateAccessToken(payload: any): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not defined in environment variables.");
    }
    return jwt.sign(payload, secret, { expiresIn: "1h" });
  }

  public async validateUser(
    email: string,
    password: string
  ): Promise<Pick<UserRecord, "id" | "email" | "role"> | null> {
    const user = await this.authenticationRepository.findUserByEmail(email);
    if (!user) return null;

    const calculatedHash = hashPassword(password, user.password_salt);
    if (calculatedHash === user.password_hash) {
      return { id: user.id, email: user.email, role: user.role };
    }

    return null;
  }

  public async findUserById(id: string) {
    const user = await this.authenticationRepository.findUserById(id);
    if (!user) return null;
    const { password_hash, password_salt, ...userResult } = user;
    return userResult;
  }

  public async resetPassword(
    userId: string,
    newPassword: string
  ): Promise<string> {
    const user = await this.authenticationRepository.findUserById(userId);
    if (!user) return "User not found";

    const newSalt = crypto.randomBytes(16).toString("hex");
    const newHash = hashPassword(newPassword, newSalt);

    await this.authenticationRepository.updateUserPassword(
      userId,
      newHash,
      newSalt
    );

    return "Password was changed";
  }
}
