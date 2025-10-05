// Handles all user-related logic, such as creating, finding, and validating users.
import crypto from "crypto";

interface User {
  id: string;
  email: string;
  hash: string;
  salt: string;
}

export class AuthenticationService {
  private users: User[] = [];

  private hashPassword(password: string, salt: string): string {
    return crypto
      .pbkdf2Sync(password, salt, 1000, 64, "sha512")
      .toString("hex");
  }

  public async register(email: string, password: string): Promise<User | null> {
    if (this.users.find((user) => user.email === email)) {
      return null; // todo: return message in case user already exists
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const newUser: User = {
      id: crypto.randomUUID(),
      email,
      salt,
      hash: this.hashPassword(password, salt),
    };

    this.users.push(newUser);
    return newUser; // todo: add msg
  }

  public async validateUser(
    email: string,
    password: string
  ): Promise<Omit<User, "hash" | "salt"> | null> {
    const user = this.users.find((user) => user.email === email);
    if (!user) {
      return null;
    }

    const hash = this.hashPassword(password, user.salt);
    if (hash === user.hash) {
      const { hash, salt, ...userResult } = user;

      return userResult;
    }

    return null;
  }

  public async findUserById(
    id: string
  ): Promise<Omit<User, "hash" | "salt"> | null> {
    const user = this.users.find((user) => user.id === id);
    if (!user) {
      return null;
    }

    const { hash, salt, ...userResult } = user;
    return userResult;
  }

  public async findUserByEmail(
    email: string
  ): Promise<Omit<User, "hash" | "salt"> | null> {
    const user = this.users.find((u) => u.email === email);
    if (!user) {
      return null;
    }
    const { hash, salt, ...userResult } = user;
    return userResult;
  }

  public async resetPassword(
    userId: string,
    newPassword: string
  ): Promise<boolean> {
    const user = this.users.find((u) => u.id === userId);
    if (!user) {
      return false;
    }

    // Generate a new salt and hash for the new password
    user.salt = crypto.randomBytes(16).toString("hex");
    user.hash = this.hashPassword(newPassword, user.salt);

    return true;
  }
}
