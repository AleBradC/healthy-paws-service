import { Pool, QueryResult } from "pg";
import { SafeUserRecord, UserRecord } from "../../types";

export class AuthenticationRepository {
  private db: Pool;

  constructor(dbPool: Pool) {
    this.db = dbPool;
  }

  public async findUserByEmail(email: string): Promise<UserRecord | null> {
    // Explicit column list (not `SELECT *`) so adding new sensitive columns
    // to Users in future migrations doesn't silently start leaking them
    // through this method.
    const result: QueryResult<UserRecord> = await this.db.query(
      `SELECT id, email, password_hash, role
         FROM Users WHERE email = $1`,
      [email]
    );
    return result.rows[0] || null;
  }

  public async findUserById(id: string): Promise<SafeUserRecord | null> {
    const result: QueryResult<SafeUserRecord> = await this.db.query(
      "SELECT id, email, role FROM Users WHERE id = $1",
      [id]
    );
    return result.rows[0] || null;
  }

  public async invalidatePreviousTokens(userId: string): Promise<void> {
    await this.db.query(
      "DELETE FROM PasswordResetTokens WHERE user_id = $1 AND used = false",
      [userId]
    );
  }

  public async createResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO PasswordResetTokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    );
  }

  public async findValidResetToken(
    tokenHash: string
  ): Promise<{ id: string; user_id: string } | null> {
    const result = await this.db.query(
      `SELECT id, user_id FROM PasswordResetTokens
       WHERE token_hash = $1 AND used = false AND expires_at > now()`,
      [tokenHash]
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
    newHash: string
  ): Promise<void> {
    await this.db.query(
      `UPDATE Users SET password_hash = $1 WHERE id = $2`,
      [newHash, userId]
    );
  }
}
