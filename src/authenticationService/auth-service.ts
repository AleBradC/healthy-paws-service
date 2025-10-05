// Handles all user-related logic, such as creating, finding, and validating users with a PostgreSQL database.
import crypto from "crypto";
import { Pool, QueryResult } from "pg";

// The User interface matching the database schema
interface User {
  id: string;
  email: string;
  hash: string;
  salt: string;
}

export class AuthenticationService {
  private db: Pool;

  // The service now depends on a database connection pool
  constructor(dbPool: Pool) {
    this.db = dbPool;
  }

  private hashPassword(password: string, salt: string): string {
    return crypto
      .pbkdf2Sync(password, salt, 1000, 64, "sha512")
      .toString("hex");
  }

  public async register(
    email: string,
    password: string
  ): Promise<Omit<User, "hash" | "salt"> | null> {
    const existingUser = await this.db.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    if (existingUser.rows.length > 0) {
      return null;
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const hash = this.hashPassword(password, salt);
    const id = crypto.randomUUID(); // <-- Generate UUID here

    // Add the 'id' column to your INSERT statement
    const result: QueryResult<User> = await this.db.query(
      "INSERT INTO users (id, email, hash, salt) VALUES ($1, $2, $3, $4) RETURNING id, email",
      [id, email, hash, salt] // <-- Pass the id as the first parameter
    );

    return result.rows[0];
  }

  public async validateUser(
    email: string,
    password: string
  ): Promise<Omit<User, "hash" | "salt"> | null> {
    const result: QueryResult<User> = await this.db.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    const user = result.rows[0];

    if (!user) {
      return null; // User not found
    }

    const calculatedHash = this.hashPassword(password, user.salt);
    if (calculatedHash === user.hash) {
      const { hash, salt, ...userResult } = user;
      return userResult;
    }

    return null; // Invalid password
  }

  public async findUserById(
    id: string
  ): Promise<Omit<User, "hash" | "salt"> | null> {
    const result = await this.db.query(
      "SELECT id, email FROM users WHERE id = $1",
      [id]
    );
    const user = result.rows[0];

    if (!user) {
      return null;
    }
    return user;
  }

  public async findUserByEmail(
    email: string
  ): Promise<Omit<User, "hash" | "salt"> | null> {
    const result = await this.db.query(
      "SELECT id, email FROM users WHERE email = $1",
      [email]
    );
    const user = result.rows[0];

    if (!user) {
      return null;
    }
    return user;
  }

  public async resetPassword(
    userId: string,
    newPassword: string
  ): Promise<boolean> {
    const userResult = await this.db.query(
      "SELECT id FROM users WHERE id = $1",
      [userId]
    );
    if (userResult.rows.length === 0) {
      return false; // User not found
    }

    const newSalt = crypto.randomBytes(16).toString("hex");
    const newHash = this.hashPassword(newPassword, newSalt);

    await this.db.query("UPDATE users SET hash = $1, salt = $2 WHERE id = $3", [
      newHash,
      newSalt,
      userId,
    ]);

    return true;
  }
}
