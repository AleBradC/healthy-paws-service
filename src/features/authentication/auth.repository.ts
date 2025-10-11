import { Pool, QueryResult } from "pg";
import { OwnerRecord, AnimalRecord } from "./types"; // Use the new separated types

export class AuthRepository {
  private db: Pool;

  constructor(dbPool: Pool) {
    this.db = dbPool;
  }

  public async findOwnerByEmail(email: string): Promise<OwnerRecord | null> {
    const result: QueryResult<OwnerRecord> = await this.db.query(
      "SELECT * FROM owners WHERE email = $1",
      [email]
    );
    return result.rows[0] || null;
  }

  public async findOwnerById(id: string): Promise<OwnerRecord | null> {
    const result: QueryResult<OwnerRecord> = await this.db.query(
      "SELECT * FROM owners WHERE id = $1",
      [id]
    );
    return result.rows[0] || null;
  }

  public async createOwnerAndAnimal(
    ownerData: OwnerRecord,
    animalData: Omit<AnimalRecord, "id" | "ownerId">
  ): Promise<{ id: string; email: string }> {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");

      // 1. Insert the owner
      const ownerResult = await client.query(
        `INSERT INTO owners (id, name, email, hash, salt)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email`,
        [
          ownerData.id,
          ownerData.name,
          ownerData.email,
          ownerData.hash,
          ownerData.salt,
        ]
      );
      const newOwner = ownerResult.rows[0];

      await client.query(
        `INSERT INTO animals (id, owner_id, name, type, breed, age, weight)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)`,
        [
          newOwner.id,
          animalData.name,
          animalData.type,
          animalData.breed,
          animalData.age,
          animalData.weight,
        ]
      );

      await client.query("COMMIT");
      return newOwner;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  public async updateUserPassword(
    userId: string,
    hash: string,
    salt: string
  ): Promise<void> {
    await this.db.query(
      "UPDATE owners SET hash = $1, salt = $2 WHERE id = $3",
      [hash, salt, userId]
    );
  }
}
