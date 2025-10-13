import * as crypto from "crypto";
import * as jwt from "jsonwebtoken";
import { AuthRepository } from "./auth.repository";
import {
  RegisterOwnerPayload,
  RegisterDoctorPayload,
  UserRecord,
} from "./types";
import { ROLES } from "./constants";

export class AuthenticationService {
  private authRepository: AuthRepository;

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository;
  }

  private hashPassword(password: string, salt: string): string {
    return crypto
      .pbkdf2Sync(password, salt, 1000, 64, "sha512")
      .toString("hex");
  }

  public async registerOwner(payload: RegisterOwnerPayload) {
    const existingUser = await this.authRepository.findUserByEmail(
      payload.owner.email
    );
    if (existingUser) {
      throw new Error("An account with this email already exists.");
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const hash = this.hashPassword(payload.owner.password, salt);

    return this.authRepository.createOwnerAndAnimal({
      email: payload.owner.email,
      hash,
      salt,
      role: ROLES.OWNER_ROLE,
      ownerName: payload.owner.name,
      animalData: payload.animal,
    });
  }

  public async registerDoctor(payload: RegisterDoctorPayload) {
    const existingUser = await this.authRepository.findUserByEmail(
      payload.doctor.email
    );
    if (existingUser) {
      throw new Error("An account with this email already exists.");
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const hash = this.hashPassword(payload.doctor.password, salt);

    return this.authRepository.createDoctor({
      email: payload.doctor.email,
      hash,
      salt,
      role: ROLES.DOCTOR_ROLE,
      doctorData: payload.doctor,
    });
  }

  generateAccessToken(payload: any): string {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error("JWT_SECRET is not defined in environment variables.");
    }

    return jwt.sign(payload, secret, { expiresIn: "1h" });
  }

  public async loginUser(
    email: string,
    password: string
  ): Promise<{
    token: string;
    user: Pick<UserRecord, "id" | "email" | "role">;
  } | null> {
    const user = await this.authRepository.findUserByEmail(email);
    if (!user) {
      return null;
    }

    const calculatedHash = this.hashPassword(password, user.salt);

    if (calculatedHash === user.hash) {
      const userPayload = { id: user.id, email: user.email, role: user.role };
      const token = this.generateAccessToken(userPayload);
      return { token, user: userPayload };
    }

    return null;
  }

  public async validateUser(
    email: string,
    password: string
  ): Promise<Pick<UserRecord, "id" | "email" | "role"> | null> {
    const user = await this.authRepository.findUserByEmail(email);
    if (!user) return null;

    const calculatedHash = this.hashPassword(password, user.salt);
    if (calculatedHash === user.hash) {
      return { id: user.id, email: user.email, role: user.role };
    }

    return null;
  }

  public async findUserById(id: string) {
    const user = await this.authRepository.findUserById(id);
    if (!user) return null;
    const { hash, salt, ...userResult } = user;
    return userResult;
  }

  public async resetPassword(
    userId: string,
    newPassword: string
  ): Promise<string> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) return "User not found";

    const newSalt = crypto.randomBytes(16).toString("hex");
    const newHash = this.hashPassword(newPassword, newSalt);

    await this.authRepository.updateUserPassword(userId, newHash, newSalt);

    return "Password was changed";
  }
}
