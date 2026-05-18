import { Pool, PoolClient } from "pg";

// Row shape for the EmailVerificationTokens table. We only ever read by hash
// (verification flow) or by user_id (resend cleanup), never by raw token —
// the raw token is held only in the email we sent to the user.
export interface VerificationTokenRow {
  id: string;
  user_id: string;
  expires_at: Date;
  used_at: Date | null;
}

export class EmailVerificationRepository {
  constructor(private readonly db: Pool) {}

  // Wipe unused tokens for a user before issuing a new one. This makes the
  // "most recent link is the only valid link" semantics explicit at the DB
  // layer — older links can't be replayed even within their expiry window.
  public async invalidatePreviousTokens(userId: string): Promise<void> {
    await this.db.query(
      `DELETE FROM EmailVerificationTokens
       WHERE user_id = $1 AND used_at IS NULL`,
      [userId]
    );
  }

  public async createToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO EmailVerificationTokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    );
  }

  public async findValidToken(
    tokenHash: string
  ): Promise<VerificationTokenRow | null> {
    const result = await this.db.query<VerificationTokenRow>(
      `SELECT id, user_id, expires_at, used_at
         FROM EmailVerificationTokens
        WHERE token_hash = $1
          AND used_at IS NULL
          AND expires_at > now()`,
      [tokenHash]
    );
    return result.rows[0] ?? null;
  }

  // Marking the user verified and the token used must happen atomically.
  // Without a transaction, a crash between the two writes leaves a verified
  // user with a still-valid token sitting in the table — minor cleanup
  // nuisance but worth avoiding for a few lines of code.
  public async markVerifiedAndConsumeToken(
    userId: string,
    tokenId: string
  ): Promise<void> {
    const client: PoolClient = await this.db.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE Users
            SET email_verified = TRUE,
                email_verified_at = now()
          WHERE id = $1`,
        [userId]
      );
      await client.query(
        `UPDATE EmailVerificationTokens
            SET used_at = now()
          WHERE id = $1`,
        [tokenId]
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // Used by the resend flow to know whether to re-send or no-op.
  public async findUnverifiedUserIdByEmail(
    email: string
  ): Promise<string | null> {
    const result = await this.db.query<{ id: string }>(
      `SELECT id FROM Users
        WHERE email = $1 AND email_verified = FALSE`,
      [email]
    );
    return result.rows[0]?.id ?? null;
  }
}
