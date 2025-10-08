import { Pool, QueryResult } from "pg";
import { UserRecord } from "./types";

export class AuthRepository {
  private db: Pool;

  constructor(dbPool: Pool) {
    this.db = dbPool;
  }

  public async findUserByEmail(email: string): Promise<UserRecord | null> {
    const result: QueryResult<UserRecord> = await this.db.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    return result.rows[0] || null;
  }

  public async findUserById(id: string): Promise<UserRecord | null> {
    const result: QueryResult<UserRecord> = await this.db.query(
      "SELECT * FROM users WHERE id = $1",
      [id]
    );
    return result.rows[0] || null;
  }

  // Updated createUser to accept all new fields
  public async createUser(
    userData: Omit<UserRecord, "id" | "hash" | "salt"> & {
      id: string;
      hash: string;
      salt: string;
    }
  ): Promise<{ id: string; email: string }> {
    const {
      id,
      name,
      email,
      hash,
      salt,
      pet_name,
      pet_type,
      pet_breed,
      pet_age,
      pet_weight,
    } = userData;
    const result = await this.db.query(
      `INSERT INTO users (id, name, email, hash, salt, pet_name, pet_type, pet_breed, pet_age, pet_weight)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, email`,
      [
        id,
        name,
        email,
        hash,
        salt,
        pet_name,
        pet_type,
        pet_breed,
        pet_age,
        pet_weight,
      ]
    );
    return result.rows[0];
  }

  public async updateUserPassword(
    userId: string,
    hash: string,
    salt: string
  ): Promise<void> {
    await this.db.query("UPDATE users SET hash = $1, salt = $2 WHERE id = $3", [
      hash,
      salt,
      userId,
    ]);
  }
}
