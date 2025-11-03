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

  public async createDoctor(
    args: CreateDoctorArgs
  ): Promise<{ id: string; email: string }> {
    const { email, hash, salt, role, doctorData } = args;
    const dataBase = await this.db.connect();

    try {
      await dataBase.query("BEGIN");

      const userResult = await dataBase.query(
        "INSERT INTO Users (email, password_hash, password_salt, role) VALUES ($1, $2, $3, $4) RETURNING id, email",
        [email, hash, salt, role]
      );
      const newUser = userResult.rows[0];

      const doctorResult = await dataBase.query(
        "INSERT INTO Doctors (user_id, name, clinic_name, clinic_address) VALUES ($1, $2, $3, $4) RETURNING id",
        [
          newUser.id,
          doctorData.name,
          doctorData.clinicName,
          doctorData.clinicAddress,
        ]
      );
      const newDoctor = doctorResult.rows[0];

      // find or Create the Specialization
      const specializationResult = await dataBase.query(
        `INSERT INTO Specializations (name) VALUES ($1)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [doctorData.specializationName]
      );
      const specializationId = specializationResult.rows[0].id;

      // link Doctor to Specialization
      await dataBase.query(
        "INSERT INTO Doctor_Specializations (doctor_id, specialization_id) VALUES ($1, $2)",
        [newDoctor.id, specializationId]
      );

      // loop through services to find/create and link them
      if (doctorData.services && doctorData.services.length > 0) {
        for (const service of doctorData.services) {
          // find or create the service under the specialization
          const serviceResult = await dataBase.query(
            `INSERT INTO Services (name, specialization_id) VALUES ($1, $2)
             ON CONFLICT (name, specialization_id) DO UPDATE SET name = EXCLUDED.name
             RETURNING id`,
            [service.name, specializationId]
          );
          const serviceId = serviceResult.rows[0].id;

          // link the service to the doctor with a price
          await dataBase.query(
            "INSERT INTO Doctor_Services (doctor_id, service_id, price) VALUES ($1, $2, $3)",
            [newDoctor.id, serviceId, service.price]
          );
        }
      }

      await dataBase.query("COMMIT");
      return { id: newUser.id, email: newUser.email };
    } catch (e) {
      await dataBase.query("ROLLBACK");
      throw e;
    } finally {
      dataBase.release();
    }
  }
}
