import { Pool, QueryResult } from "pg";
import {
  UserRecord,
  SafeUserRecord,
  CreateOwnerArgs,
  CreateDoctorArgs,
} from "../../core/utils/types";

export class RegistrationRepository {
  private db: Pool;

  constructor(dbPool: Pool) {
    this.db = dbPool;
  }

  public async findUserByEmail(email: string): Promise<UserRecord | null> {
    const result: QueryResult<UserRecord> = await this.db.query(
      "SELECT * FROM Users WHERE email = $1",
      [email],
    );
    return result.rows[0] || null;
  }

  public async findUserById(id: string): Promise<SafeUserRecord | null> {
    const result: QueryResult<SafeUserRecord> = await this.db.query(
      "SELECT id, email, role FROM Users WHERE id = $1",
      [id],
    );
    return result.rows[0] || null;
  }

  public async createOwnerAndPet(
    args: CreateOwnerArgs,
  ): Promise<{ id: string; email: string }> {
    const { email, hash, role, ownerName, petData } = args;
    const client = await this.db.connect();

    try {
      await client.query("BEGIN");

      const userResult = await client.query(
        "INSERT INTO Users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email",
        [email, hash, role],
      );
      const newUser = userResult.rows[0];

      await client.query("INSERT INTO Owners (id, name) VALUES ($1, $2)", [
        newUser.id,
        ownerName,
      ]);

      await client.query(
        "INSERT INTO Pets (owner_id, name, type, breed, age, weight) VALUES ($1, $2, $3, $4, $5, $6)",
        [
          newUser.id,
          petData.name,
          petData.type,
          petData.breed,
          petData.age,
          petData.weight,
        ],
      );

      await client.query("COMMIT");

      return { id: newUser.id, email: newUser.email };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  public async createDoctorWithDetails(
    args: CreateDoctorArgs,
  ): Promise<{ id: string; email: string }> {
    const { email, hash, role, doctorData } = args;
    const { name, clinicName, clinicAddress, specializations } = doctorData;
    const client = await this.db.connect();

    try {
      await client.query("BEGIN");

      const userResult = await client.query(
        "INSERT INTO Users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email",
        [email, hash, role],
      );
      const newUser = userResult.rows[0];

      await client.query(
        "INSERT INTO Doctors (id, name, clinic_name, clinic_address) VALUES ($1, $2, $3, $4)",
        [newUser.id, name, clinicName, clinicAddress],
      );
      const newDoctorId = newUser.id;

      for (const specPayload of specializations) {
        const specResult = await client.query(
          `INSERT INTO Specializations (name) VALUES ($1)
           ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [specPayload.name],
        );
        const specializationId = specResult.rows[0].id;

        await client.query(
          "INSERT INTO Doctor_Specializations (doctor_id, specialization_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [newDoctorId, specializationId],
        );

        for (const servicePayload of specPayload.services) {
          const serviceResult = await client.query(
            `INSERT INTO Services (name) VALUES ($1)
             ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
             RETURNING id`,
            [servicePayload.name],
          );
          const serviceId = serviceResult.rows[0].id;

          await client.query(
            "INSERT INTO Specialization_Services (specialization_id, service_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [specializationId, serviceId],
          );

          await client.query(
            `INSERT INTO Doctor_Service_Pricing (doctor_id, specialization_id, service_id, price)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (doctor_id, specialization_id, service_id) DO NOTHING`,
            [newDoctorId, specializationId, serviceId, servicePayload.price],
          );
        }
      }

      await client.query("COMMIT");

      return { id: newUser.id, email: newUser.email };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}
