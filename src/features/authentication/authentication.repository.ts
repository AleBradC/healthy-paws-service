import { Pool, QueryResult } from "pg";
import { UserRecord } from "../../types";

export class AuthenticationRepository {
  private db: Pool;

  constructor(dbPool: Pool) {
    this.db = dbPool;
  }

  public async findUserByEmail(email: string): Promise<UserRecord | null> {
    const result: QueryResult<UserRecord> = await this.db.query(
      "SELECT * FROM Users WHERE email = $1",
      [email]
    );
    return result.rows[0] || null;
  }

  public async findUserById(id: string): Promise<UserRecord | null> {
    const result: QueryResult<UserRecord> = await this.db.query(
      "SELECT * FROM Users WHERE id = $1",
      [id]
    );
    return result.rows[0] || null;
  }

  public async updateUserPassword(
    userId: string,
    hash: string,
    salt: string
  ): Promise<void> {
    await this.db.query(
      "UPDATE Users SET password_hash = $1, password_salt = $2 WHERE id = $3",
      [hash, salt, userId]
    );
  }
}
