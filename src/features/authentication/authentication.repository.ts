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

  public async findDoctorIdByUserId(userId: string): Promise<string | null> {
    const result: QueryResult<{ id: string }> = await this.db.query(
      "SELECT id FROM Doctors WHERE user_id = $1",
      [userId]
    );
    return result.rows[0]?.id || null;
  }

  public async findOwnerIdByUserId(userId: string): Promise<string | null> {
    const result: QueryResult<{ id: string }> = await this.db.query(
      "SELECT id FROM Owners WHERE user_id = $1",
      [userId]
    );
    return result.rows[0]?.id || null;
  }
}
