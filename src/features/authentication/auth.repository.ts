import { Pool, QueryResult } from "pg";

interface UserRecord {
  id: string;
  email: string;
  hash: string;
  salt: string;
}

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

  public async createUser(
    id: string,
    email: string,
    hash: string,
    salt: string
  ): Promise<{ id: string; email: string }> {
    const result = await this.db.query(
      "INSERT INTO users (id, email, hash, salt) VALUES ($1, $2, $3, $4) RETURNING id, email",
      [id, email, hash, salt]
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
