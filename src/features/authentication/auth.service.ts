import crypto from "crypto";
import { AuthRepository } from "./auth.repository";

type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  petName: string;
  petType: string;
  petBreed: string;
  petAge: number;
  petWeight: number;
};

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

  public async register(payload: RegisterPayload) {
    const existingUser = await this.authRepository.findUserByEmail(
      payload.email
    );
    if (existingUser) {
      return null; // Return null to indicate user already exists
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const hash = this.hashPassword(payload.password, salt);
    const id = crypto.randomUUID();

    const newUser = {
      id,
      name: payload.name,
      email: payload.email,
      hash,
      salt,
      pet_name: payload.petName,
      pet_type: payload.petType,
      pet_breed: payload.petBreed,
      pet_age: payload.petAge,
      pet_weight: payload.petWeight,
    };

    return this.authRepository.createUser(newUser);
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
