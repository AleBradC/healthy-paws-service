import pool from "../../core/config/db";
import {
  AddDoctorAvailabilityInput,
  AddDoctorSpecializationInput,
  RemoveDoctorAvailabilityInput,
  RemoveDoctorSpecializationInput,
  UpdateDoctorProfileInput,
  UpdateDoctorSpecializationInput,
} from "../../schema/resolvers.types";
import {
  Doctor,
  Specialization,
  Service,
  Availability,
  Appointment,
  Pet,
} from "../../types";
import { ClientError } from "../../errors/ClientError";
import { SystemError } from "../../errors/SystemError";
import { DoctorErrorMessages, SystemErrorMessages } from "../../errors/constants";

export async function getAllDoctors(
  limit?: number,
  skip?: number,
  name?: string,
  specializationId?: string
): Promise<Doctor[]> {
  let query = `
    SELECT *
    FROM Doctors d
    WHERE EXISTS (
      SELECT 1
      FROM Doctor_Specializations ds
      WHERE ds.doctor_id = d.id
      ${specializationId ? "AND ds.specialization_id = $" + (3 + (name ? 1 : 0)) : ""}
    )
  `;
  const params: unknown[] = [skip, limit];
  const paramIndex = 3;

  if (name) {
    query += ` AND (d.name ILIKE $${paramIndex} OR d.clinic_name ILIKE $${paramIndex})`;
    params.push(`%${name}%`);
  }

  if (specializationId) {
    params.push(specializationId);
  }

  query += `
    ORDER BY d.name ASC
    OFFSET $1 LIMIT $2;
  `;

  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (err) {
    throw new SystemError(SystemErrorMessages.DB_QUERY_FAILED, err);
  }
}

export async function getDoctorsTotalCount(
  name?: string,
  specializationId?: string
): Promise<number> {
  let query = `
    SELECT COUNT(*)
    FROM Doctors d
    WHERE EXISTS (
      SELECT 1
      FROM Doctor_Specializations ds
      WHERE ds.doctor_id = d.id
      ${specializationId ? "AND ds.specialization_id = $" + (1 + (name ? 1 : 0)) : ""}
    )
  `;
  const params: unknown[] = [];
  const paramIndex = 1;

  if (name) {
    query += ` AND (d.name ILIKE $${paramIndex} OR d.clinic_name ILIKE $${paramIndex})`;
    params.push(`%${name}%`);
  }

  if (specializationId) {
    params.push(specializationId);
  }

  try {
    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count, 10);
  } catch (err) {
    throw new SystemError(SystemErrorMessages.DB_QUERY_FAILED, err);
  }
}

export async function getAllSpecializations(): Promise<Specialization[]> {
  const query = `SELECT id, name FROM Specializations ORDER BY name ASC;`;
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (err) {
    throw new SystemError(SystemErrorMessages.DB_QUERY_FAILED, err);
  }
}

export async function getDoctorById(doctorId: string): Promise<Doctor | null> {
  const query = `SELECT * FROM Doctors WHERE id = $1;`;
  try {
    const result = await pool.query(query, [doctorId]);
    return result.rows[0] || null;
  } catch (err) {
    throw new SystemError(SystemErrorMessages.DB_QUERY_FAILED, err);
  }
}

// doctorId IS users.id (shared primary key, see database.sql).
export async function getEmailDoctor(doctorId: string): Promise<string | null> {
  const query = `SELECT email FROM Users WHERE id = $1;`;
  try {
    const result = await pool.query(query, [doctorId]);
    return result.rows[0]?.email || null;
  } catch (err) {
    throw new SystemError(SystemErrorMessages.DB_QUERY_FAILED, err);
  }
}

export async function getSpecializationsByDoctor(
  doctorId: string
): Promise<Specialization[]> {
  const query = `
    SELECT s.id, s.name 
    FROM Doctor_Specializations ds
    JOIN Specializations s ON ds.specialization_id = s.id
    WHERE ds.doctor_id = $1;
  `;
  try {
    const result = await pool.query(query, [doctorId]);
    return result.rows;
  } catch (err) {
    throw new SystemError(SystemErrorMessages.DB_QUERY_FAILED, err);
  }
}

export async function getServicesByDoctor(
  doctorId: string
): Promise<Service[]> {
  const query = `
    SELECT s.id, dsp.specialization_id, s.name, dsp.price
    FROM Doctor_Service_Pricing AS dsp
    JOIN Services AS s ON dsp.service_id = s.id
    WHERE dsp.doctor_id = $1;
  `;
  try {
    const result = await pool.query(query, [doctorId]);
    return result.rows.map((row: Record<string, any>) => ({
      ...row,
      price: row.price != null ? parseFloat(row.price) : 0.0,
    } as Service));
  } catch (err) {
    throw new SystemError(SystemErrorMessages.DB_QUERY_FAILED, err);
  }
}

export async function getServicesByDoctorAndSpecialization(
  doctorId: string,
  specializationId: string
): Promise<Service[]> {
  const query = `
    SELECT s.id, dsp.specialization_id, s.name, dsp.price
    FROM Doctor_Service_Pricing AS dsp
    JOIN Services AS s ON dsp.service_id = s.id
    WHERE dsp.doctor_id = $1 AND dsp.specialization_id = $2;
  `;
  try {
    const result = await pool.query(query, [doctorId, specializationId]);
    return result.rows.map((row: any) => ({
      ...row,
      price: row.price != null ? parseFloat(row.price) : 0.0,
    }));
  } catch (err) {
    throw new SystemError(SystemErrorMessages.DB_QUERY_FAILED, err);
  }
}

export async function getAvailabilitiesByDoctor(
  doctorId: string
): Promise<Availability[]> {
  const query = `
    SELECT id, available_datetime 
    FROM Availabilities 
    WHERE doctor_id = $1 AND available_datetime >= CURRENT_TIMESTAMP
    ORDER BY available_datetime;
  `;
  try {
    const result = await pool.query(query, [doctorId]);
    return result.rows.map((row: any) => ({
      ...row,
      available_datetime: row.available_datetime.toISOString(),
    }));
  } catch (err) {
    throw new SystemError(SystemErrorMessages.DB_QUERY_FAILED, err);
  }
}

export async function getAppointmentsByDoctor(
  doctorId: string
): Promise<Appointment[]> {
  const query = `SELECT * FROM Appointments WHERE doctor_id = $1 ORDER BY appointment_datetime DESC;`;
  try {
    const result = await pool.query(query, [doctorId]);
    return result.rows.map((row: any) => ({
      ...row,
      datetime: row.appointment_datetime.toISOString(),
    }));
  } catch (err) {
    throw new SystemError(SystemErrorMessages.DB_QUERY_FAILED, err);
  }
}

export async function getPatientsByDoctor(doctorId: string): Promise<Pet[]> {
  const query = `
    SELECT DISTINCT p.id, p.name, p.type, p.breed, p.age, p.weight, p.owner_id
    FROM Appointments a 
    JOIN Pets p ON a.pet_id = p.id
    WHERE a.doctor_id = $1;
  `;
  try {
    const result = await pool.query(query, [doctorId]);
    return result.rows.map((row: any) => ({
      ...row,
      weight: parseFloat(row.weight),
    }));
  } catch (err) {
    throw new SystemError(SystemErrorMessages.DB_QUERY_FAILED, err);
  }
}

export async function updateDoctorProfile(
  input: UpdateDoctorProfileInput
): Promise<Doctor | null> {
  const { doctorId, name, clinicName, clinicAddress } = input;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const doctorResult = await client.query(
      "SELECT id FROM Doctors WHERE id = $1",
      [doctorId]
    );
    if (doctorResult.rows.length === 0) {
      throw new ClientError(DoctorErrorMessages.DOCTOR_NOT_FOUND, 404);
    }

    if (name !== undefined) {
      await client.query("UPDATE Doctors SET name = $1 WHERE id = $2", [
        name,
        doctorId,
      ]);
    }
    if (clinicName !== undefined) {
      await client.query("UPDATE Doctors SET clinic_name = $1 WHERE id = $2", [
        clinicName,
        doctorId,
      ]);
    }
    if (clinicAddress !== undefined) {
      await client.query(
        "UPDATE Doctors SET clinic_address = $1 WHERE id = $2",
        [clinicAddress, doctorId]
      );
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");

    if (e instanceof ClientError || e instanceof SystemError) {
      throw e;
    }
    throw new SystemError(SystemErrorMessages.DB_TRANSACTION_FAILED, e);
  } finally {
    client.release();
  }

  return getDoctorById(doctorId);
}

export async function addDoctorSpecialization(
  input: AddDoctorSpecializationInput
): Promise<Doctor | null> {
  const { doctorId, specializationName, services } = input;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const specResult = await client.query(
      `INSERT INTO Specializations (name) VALUES ($1)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [specializationName]
    );
    const specializationId = specResult.rows[0].id;

    await client.query(
      `INSERT INTO Doctor_Specializations (doctor_id, specialization_id)
       VALUES ($1, $2)
       ON CONFLICT (doctor_id, specialization_id) DO NOTHING`,
      [doctorId, specializationId]
    );

    if (services.length > 0) {
      for (const service of services) {
        const serviceResult = await client.query(
          `INSERT INTO Services (name) VALUES ($1)
           ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [service.name]
        );
        const serviceId = serviceResult.rows[0].id;

        await client.query(
          `INSERT INTO Specialization_Services (specialization_id, service_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [specializationId, serviceId]
        );

        await client.query(
          `INSERT INTO Doctor_Service_Pricing (doctor_id, specialization_id, service_id, price)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (doctor_id, specialization_id, service_id)
           DO UPDATE SET price = EXCLUDED.price;`,
          [doctorId, specializationId, serviceId, service.price]
        );
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");

    if (error instanceof ClientError || error instanceof SystemError) {
      throw error;
    }
    throw new SystemError(SystemErrorMessages.DB_TRANSACTION_FAILED, error);
  } finally {
    client.release();
  }

  return getDoctorById(doctorId);
}

export async function removeDoctorSpecialization(
  input: RemoveDoctorSpecializationInput
): Promise<Doctor | null> {
  const { doctorId, specializationId } = input;

  try {
    const result = await pool.query(
      `DELETE FROM Doctor_Specializations WHERE doctor_id = $1 AND specialization_id = $2 RETURNING doctor_id`,
      [doctorId, specializationId]
    );

    if (result.rows.length === 0) {
      throw new ClientError(
        DoctorErrorMessages.DOCTOR_SPECIALIZATION_DELETE_FAIL,
        404
      );
    }

    return getDoctorById(doctorId);
  } catch (err) {
    if (err instanceof ClientError || err instanceof SystemError) {
      throw err;
    }
    throw new SystemError(SystemErrorMessages.DB_QUERY_FAILED, err);
  }
}

export async function updateDoctorSpecialization(
  input: UpdateDoctorSpecializationInput
): Promise<Doctor | null> {
  const { doctorId, specializationId, services } = input;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Ensure the doctor-specialization relationship exists
    await client.query(
      `INSERT INTO Doctor_Specializations (doctor_id, specialization_id)
       VALUES ($1, $2)
       ON CONFLICT (doctor_id, specialization_id) DO NOTHING`,
      [doctorId, specializationId]
    );

    // Fetch current service_ids for this doctor-specialization pair
    const currentDbServicesResult = await client.query(
      `SELECT service_id FROM Doctor_Service_Pricing WHERE doctor_id = $1 AND specialization_id = $2`,
      [doctorId, specializationId]
    );
    const currentDbServiceIds = new Set(
      currentDbServicesResult.rows.map((r: any) => r.service_id)
    );
    const incomingServiceIds = new Set(
      services.map((s: any) => s.id).filter(Boolean)
    );

    const serviceIdsToDelete = [...currentDbServiceIds].filter(
      (id) => !incomingServiceIds.has(id)
    );
    if (serviceIdsToDelete.length > 0) {
      await client.query(
        `DELETE FROM Doctor_Service_Pricing WHERE doctor_id = $1 AND specialization_id = $2 AND service_id = ANY($3::uuid[])`,
        [doctorId, specializationId, serviceIdsToDelete]
      );
    }

    for (const service of services) {
      let serviceId = service.id;

      if (!serviceId || serviceId.startsWith("custom-")) {
        const newServiceResult = await client.query(
          `INSERT INTO Services (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
          [service.name]
        );
        serviceId = newServiceResult.rows[0].id;

        await client.query(
          `INSERT INTO Specialization_Services (specialization_id, service_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [specializationId, serviceId]
        );
      }

      await client.query(
        `INSERT INTO Doctor_Service_Pricing (doctor_id, specialization_id, service_id, price)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (doctor_id, specialization_id, service_id) DO UPDATE SET price = EXCLUDED.price;`,
        [doctorId, specializationId, serviceId, service.price]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");

    if (error instanceof ClientError || error instanceof SystemError) {
      throw error;
    }
    throw new SystemError(SystemErrorMessages.DB_TRANSACTION_FAILED, error);
  } finally {
    client.release();
  }

  return getDoctorById(doctorId);
}

export async function addDoctorAvailability(
  input: AddDoctorAvailabilityInput
): Promise<Doctor | null> {
  const { doctorId, availabilities } = input;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingDoctor = await client.query(
      `SELECT id FROM Doctors WHERE id = $1`,
      [doctorId]
    );
    if (existingDoctor.rows.length === 0) {
      throw new ClientError(DoctorErrorMessages.DOCTOR_NOT_FOUND, 404);
    }

    for (const datetime of availabilities) {
      const normalizedDatetime = new Date(datetime).toISOString();
      await client.query(
        `INSERT INTO Availabilities (doctor_id, available_datetime)
         VALUES ($1, $2)
         ON CONFLICT (doctor_id, available_datetime) DO NOTHING`,
        [doctorId, normalizedDatetime]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");

    if (error instanceof ClientError || error instanceof SystemError) {
      throw error;
    }
    throw new SystemError(SystemErrorMessages.DB_TRANSACTION_FAILED, error);
  } finally {
    client.release();
  }

  return getDoctorById(doctorId);
}

export async function removeDoctorAvailability(
  input: RemoveDoctorAvailabilityInput
): Promise<Doctor | null> {
  const { doctorId, availabilityId } = input;

  try {
    const result = await pool.query(
      `DELETE FROM Availabilities WHERE doctor_id = $1 AND id = $2 RETURNING doctor_id`,
      [doctorId, availabilityId]
    );

    if (result.rows.length === 0) {
      throw new ClientError(
        DoctorErrorMessages.DOCTOR_AVAILABILITY_DELETE_FAIL,
        404
      );
    }

    return getDoctorById(doctorId);
  } catch (err) {
    if (err instanceof ClientError || err instanceof SystemError) {
      throw err;
    }
    throw new SystemError(SystemErrorMessages.DB_QUERY_FAILED, err);
  }
}
