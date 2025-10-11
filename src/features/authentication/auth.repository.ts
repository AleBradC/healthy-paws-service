import { Pool, QueryResult } from "pg";
import { UserRecord, DoctorPayload, AnimalPayload } from "./types";
import { ROLES } from "./constants";

interface CreateOwnerArgs {
  email: string;
  hash: string;
  salt: string;
  role: ROLES.OWNER_ROLE;
  ownerName: string;
  animalData: AnimalPayload;
}

interface CreateDoctorArgs {
  email: string;
  hash: string;
  salt: string;
  role: ROLES.DOCTOR_ROLE;
  doctorData: DoctorPayload;
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

  public async createOwnerAndAnimal(
    args: CreateOwnerArgs
  ): Promise<{ id: string; email: string }> {
    const { email, hash, salt, role, ownerName, animalData } = args;
    const client = await this.db.connect();

    try {
      await client.query("BEGIN");

      const userResult = await client.query(
        "INSERT INTO users (email, hash, salt, role) VALUES ($1, $2, $3, $4) RETURNING id, email",
        [email, hash, salt, role]
      );
      const newUser = userResult.rows[0];

      const ownerResult = await client.query(
        "INSERT INTO owners (user_id, name) VALUES ($1, $2) RETURNING id",
        [newUser.id, ownerName]
      );
      const newOwnerProfile = ownerResult.rows[0];

      await client.query(
        "INSERT INTO animals (owner_id, name, type, breed, age, weight) VALUES ($1, $2, $3, $4, $5, $6)",
        [
          newOwnerProfile.id,
          animalData.name,
          animalData.type,
          animalData.breed,
          animalData.age,
          animalData.weight,
        ]
      );

      await client.query("COMMIT");
      return { id: newUser.id, email: newUser.email };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  public async createDoctor(
    args: CreateDoctorArgs
  ): Promise<{ id: string; email: string }> {
    const { email, hash, salt, role, doctorData } = args;
    const client = await this.db.connect();

    try {
      await client.query("BEGIN");

      const userResult = await client.query(
        "INSERT INTO users (email, hash, salt, role) VALUES ($1, $2, $3, $4) RETURNING id, email",
        [email, hash, salt, role]
      );
      const newUser = userResult.rows[0];

      const doctorResult = await client.query(
        "INSERT INTO doctors (user_id, name, specialization, clinic_name, clinic_address) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [
          newUser.id,
          doctorData.name,
          doctorData.specialty,
          doctorData.clinic,
          doctorData.address,
        ]
      );
      const newDoctorProfile = doctorResult.rows[0];

      if (doctorData.services && doctorData.services.length > 0) {
        for (const service of doctorData.services) {
          await client.query(
            "INSERT INTO doctor_services (doctor_id, service_name, price) VALUES ($1, $2, $3)",
            [newDoctorProfile.id, service.service, service.price]
          );
        }
      }

      await client.query("COMMIT");
      return { id: newUser.id, email: newUser.email };
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
    await this.db.query("UPDATE users SET hash = $1, salt = $2 WHERE id = $3", [
      hash,
      salt,
      userId,
    ]);
  }
}
