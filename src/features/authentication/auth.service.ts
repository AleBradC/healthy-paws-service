import crypto from "crypto";
import { AuthRepository } from "./auth.repository";

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

  public async register(email: string, password: string) {
    const existingUser = await this.authRepository.findUserByEmail(email);
    if (existingUser) {
      return "User already exists";
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const hash = this.hashPassword(password, salt);
    const id = crypto.randomUUID();

    return this.authRepository.createUser(id, email, hash, salt);
  }

  public async validateUser(email: string, password: string) {
    const user = await this.authRepository.findUserByEmail(email);
    if (!user) {
      return "User not found";
    }

    const calculatedHash = this.hashPassword(password, user.salt);
    if (calculatedHash === user.hash) {
      const { hash, salt, ...userResult } = user;
      return userResult;
    }

    return "Invalid password";
  }

  public async findUserById(id: string) {
    const user = await this.authRepository.findUserById(id);
    if (!user) return null;
    const { hash, salt, ...userResult } = user;
    return userResult;
  }

  public async findUserByEmail(email: string) {
    const user = await this.authRepository.findUserByEmail(email);
    if (!user) return null;
    const { hash, salt, ...userResult } = user;
    return userResult;
  }

  public async resetPassword(
    userId: string,
    newPassword: string
  ): Promise<string> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      return "User not found";
    }

    const newSalt = crypto.randomBytes(16).toString("hex");
    const newHash = this.hashPassword(newPassword, newSalt);
    await this.authRepository.updateUserPassword(userId, newHash, newSalt);

    return "Password was changed";
  }
}
