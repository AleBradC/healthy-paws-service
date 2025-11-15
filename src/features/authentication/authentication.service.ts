import * as crypto from "crypto";
import * as jwt from "jsonwebtoken";
import { AuthenticationRepository } from "./authentication.repository";
import { UserRecord, UserResponse, JwtPayload } from "../../types";
import { hashPassword } from "../../helpers";
import { ErrorMessages } from "../../constants";

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
    if (!user) return null;
    const calculatedHash = hashPassword(password, user.password_salt);
    if (calculatedHash === user.password_hash) {
      return { id: user.id, email: user.email, role: user.role };
    }
    return null;
  }

  public async findUserById(id: string): Promise<UserRecord | null> {
    const user = await this.authenticationRepository.findUserById(id);
    if (!user) return null;
    return user;
  }

  public async findOwnerIdByUserId(userId: string): Promise<string | null> {
    return this.authenticationRepository.findOwnerIdByUserId(userId);
  }

  public async findDoctorIdByUserId(userId: string): Promise<string | null> {
    return this.authenticationRepository.findDoctorIdByUserId(userId);
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
