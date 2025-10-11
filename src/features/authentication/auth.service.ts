import crypto from "crypto";
import { AuthRepository } from "./auth.repository";
import { RegisterPayload, OwnerRecord } from "./types";

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
    const existingOwner = await this.authRepository.findOwnerByEmail(
      payload.owner.email
    );
    if (existingOwner) {
      return null;
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const hash = this.hashPassword(payload.owner.password, salt);
    const ownerId = crypto.randomUUID();

    const newOwner: OwnerRecord = {
      id: ownerId,
      name: payload.owner.name,
      email: payload.owner.email,
      hash,
      salt,
    };

    const newAnimal = {
      name: payload.animal.name,
      type: payload.animal.type,
      breed: payload.animal.breed,
      age: payload.animal.age,
      weight: payload.animal.weight,
    };

    return this.authRepository.createOwnerAndAnimal(newOwner, newAnimal);
  }

  public async validateUser(email: string, password: string) {
    const owner = await this.authRepository.findOwnerByEmail(email);
    if (!owner) {
      return "User not found";
    }

    const calculatedHash = this.hashPassword(password, owner.salt);
    if (calculatedHash === owner.hash) {
      const { hash, salt, ...ownerResult } = owner;
      return ownerResult; // todo Return owner data without hash and salt
    }

    return "Invalid password";
  }

  public async findUserById(id: string) {
    const owner = await this.authRepository.findOwnerById(id);
    if (!owner) return null;
    const { hash, salt, ...ownerResult } = owner;
    return ownerResult;
  }

  public async findUserByEmail(email: string) {
    const owner = await this.authRepository.findOwnerByEmail(email);
    if (!owner) return null;
    const { hash, salt, ...ownerResult } = owner;
    return ownerResult;
  }

  public async resetPassword(
    userId: string,
    newPassword: string
  ): Promise<string> {
    const owner = await this.authRepository.findOwnerById(userId);
    if (!owner) {
      return "User not found";
    }

    const newSalt = crypto.randomBytes(16).toString("hex");
    const newHash = this.hashPassword(newPassword, newSalt);
    await this.authRepository.updateUserPassword(userId, newHash, newSalt);

    return "Password was changed";
  }
}
