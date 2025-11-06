import { Pool, QueryResult } from "pg";
import { UserRecord, CreateOwnerArgs, CreateDoctorArgs } from "../../types";

export class RegistrationRepository {
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

  public async createOwnerAndPet(
    args: CreateOwnerArgs
  ): Promise<{ id: string; email: string }> {
    const { email, hash, salt, role, ownerName, petData } = args;
    const dataBase = await this.db.connect();

    try {
      await dataBase.query("BEGIN");

      const userResult = await dataBase.query(
        "INSERT INTO Users (email, password_hash, password_salt, role) VALUES ($1, $2, $3, $4) RETURNING id, email",
        [email, hash, salt, role]
      );
      const newUser = userResult.rows[0];

      const ownerResult = await dataBase.query(
        "INSERT INTO Owners (user_id, name) VALUES ($1, $2) RETURNING id",
        [newUser.id, ownerName]
      );
      const newOwner = ownerResult.rows[0];

      await dataBase.query(
        "INSERT INTO Pets (owner_id, name, type, breed, age, weight) VALUES ($1, $2, $3, $4, $5, $6)",
        [
          newOwner.id,
          petData.name,
          petData.type,
          petData.breed,
          petData.age,
          petData.weight,
        ]
      );

      await dataBase.query("COMMIT");
      return { id: newUser.id, email: newUser.email };
    } catch (e) {
      await dataBase.query("ROLLBACK");
      throw e;
    } finally {
      dataBase.release();
    }
  }

  public async createDoctorWithDetails(
    args: CreateDoctorArgs
  ): Promise<{ id: string; email: string }> {
    const { email, hash, salt, role, doctorData } = args;
    const { name, clinicName, clinicAddress, specializations } = doctorData;
    const client = await this.db.connect();

    try {
      await client.query("BEGIN");

      const userResult = await client.query(
        "INSERT INTO Users (email, password_hash, password_salt, role) VALUES ($1, $2, $3, $4) RETURNING id, email",
        [email, hash, salt, role]
      );
      const newUser = userResult.rows[0];

      const doctorResult = await client.query(
        "INSERT INTO Doctors (user_id, name, clinic_name, clinic_address) VALUES ($1, $2, $3, $4) RETURNING id",
        [newUser.id, name, clinicName, clinicAddress]
      );
      const newDoctorId = doctorResult.rows[0].id;

      // Step 3: Loop through the payload to create and link specializations and services
      for (const specPayload of specializations) {
        // Step 3a: Find or create the specialization in the master 'Specializations' list
        const specResult = await client.query(
          `INSERT INTO Specializations (name) VALUES ($1)
           ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [specPayload.name]
        );
        const specializationId = specResult.rows[0].id;

        // Step 3b: Link the doctor to this specialization in 'Doctor_Specializations'
        await client.query(
          "INSERT INTO Doctor_Specializations (doctor_id, specialization_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [newDoctorId, specializationId]
        );

        // Step 3c: Loop through the services for this specialization
        for (const servicePayload of specPayload.services) {
          // Find or create the service in the master 'Services' list
          const serviceResult = await client.query(
            `INSERT INTO Services (name) VALUES ($1)
             ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
             RETURNING id`,
            [servicePayload.name]
          );
          const serviceId = serviceResult.rows[0].id;

          // Ensure the service is linked to the specialization in the 'Specialization_Services' template table
          await client.query(
            "INSERT INTO Specialization_Services (specialization_id, service_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [specializationId, serviceId]
          );

          // Insert the doctor-specific price into the new 'Doctor_Service_Pricing' table
          // This correctly links the price to the doctor, the specialization, AND the service.
          await client.query(
            `INSERT INTO Doctor_Service_Pricing (doctor_id, specialization_id, service_id, price)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (doctor_id, specialization_id, service_id) DO NOTHING`,
            [newDoctorId, specializationId, serviceId, servicePayload.price]
          );
        }
      }

      await client.query("COMMIT");
      return { id: newUser.id, email: newUser.email };
    } catch (e) {
      await client.query("ROLLBACK");
      console.error("Error during doctor registration transaction:", e);
      throw new Error("Failed to create doctor. Transaction was rolled back.");
    } finally {
      client.release();
    }
  }
}
