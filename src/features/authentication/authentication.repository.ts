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

  public async createResetToken(
    userId: string,
    resetCode: string,
    expiresAt: Date
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO PasswordResetTokens (user_id, reset_code, expires_at) 
       VALUES ($1, $2, $3)`,
      [userId, resetCode, expiresAt]
    );
  }

  public async findValidResetToken(
    userId: string,
    code: string
  ): Promise<{ id: string } | null> {
    const now = new Date();
    const result = await this.db.query(
      `SELECT id FROM PasswordResetTokens 
       WHERE user_id = $1 AND reset_code = $2 AND expires_at > $3 AND used = false`,
      [userId, code, now]
    );
    return result.rows[0] || null;
  }

  public async markResetTokenUsed(tokenId: string): Promise<void> {
    await this.db.query(
      `UPDATE PasswordResetTokens SET used = true WHERE id = $1`,
      [tokenId]
    );
  }

  public async updateUserPassword(
    userId: string,
    newHash: string,
    newSalt: string
  ): Promise<void> {
    await this.db.query(
      `UPDATE Users SET password_hash = $1, password_salt = $2 WHERE id = $3`,
      [newHash, newSalt, userId]
    );
  }
}
