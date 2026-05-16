import { PoolClient } from "pg";
import { GraphQLError } from "graphql";
import pool from "../../core/config/db";
import {
  ActiveTreatmentInput,
  CreateAppointmentInput,
  LifelongConditionInput,
  RemoveAppointmentInput,
  UpdateAppointmentInput,
} from "../../schema/resolvers.types";
import { Appointment } from "../../types";
import { addDoctorAvailability } from "../doctors/doctors.repository";
import { formatAppointmentRow } from "./appointments.helpers";
import { ClientError } from "../../errors/ClientError";
import { SystemError } from "../../errors/SystemError";
import {
  SystemErrorMessages,
  PostgresErrorCode,
  AppointmentErrorMessages,
  PetErrorMessages,
} from "../../errors/constants";

/**
 * Verifies that an appointment belongs to the user (either the doctor or the owner of the pet).
 */
export async function verifyAppointmentOwnership(
  roleId: string,
  role: string,
  appointmentId: string
): Promise<void> {
  let query: string;
  if (role === "doctor") {
    query = `
      SELECT 1 
      FROM Appointments 
      WHERE id = $1 AND doctor_id = $2;
    `;
  } else {
    query = `
      SELECT 1 
      FROM Appointments a 
      JOIN Pets p ON a.pet_id = p.id 
      WHERE a.id = $1 AND p.owner_id = $2;
    `;
  }

  const result = await pool.query(query, [appointmentId, roleId]);

  if (result.rowCount === 0) {
    throw new GraphQLError("You do not have permission to access or modify this appointment.", {
      extensions: { code: "FORBIDDEN" },
    });
  }
}

export async function getAppointmentById(
  id: string
): Promise<Appointment | null> {
  const query = `SELECT * FROM Appointments WHERE id = $1;`;
  try {
    const result = await pool.query(query, [id]);
    return result.rows[0] ? formatAppointmentRow(result.rows[0]) : null;
  } catch (err) {
    throw new SystemError(SystemErrorMessages.DB_QUERY_FAILED, err);
  }
}

export async function createAppointment(
  input: CreateAppointmentInput
): Promise<Appointment | null> {
  const { petId, doctorId, consultationType } = input;
  const appointmentDatetime = new Date(input.appointmentDatetime).toISOString();
  // New appointments start as Pending for Approval
  const status = "Pending";

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check if slot is available and occupy it
    const availResult = await client.query(
      `DELETE FROM Availabilities 
       WHERE doctor_id = $1 AND available_datetime = $2
       RETURNING id`,
      [doctorId, appointmentDatetime]
    );

    if (availResult.rows.length === 0) {
      // Check if there's an active appointment for this slot
      const appointmentCheck = await client.query(
        `SELECT id FROM Appointments 
         WHERE doctor_id = $1 AND appointment_datetime = $2 
         AND status NOT IN ('Cancelled', 'Denied')`,
        [doctorId, appointmentDatetime]
      );

      if (appointmentCheck.rows.length > 0) {
        throw new ClientError(
          AppointmentErrorMessages.APPOINTMENT_SLOT_TAKEN,
          409
        );
      }

      throw new ClientError(
        "This appointment slot is no longer available. Please select a different time.",
        400
      );
    }

    const query = `
      INSERT INTO Appointments (pet_id, doctor_id, appointment_datetime, status, consultation_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [
      petId,
      doctorId,
      appointmentDatetime,
      status,
      consultationType,
    ];

    const result = await client.query(query, values);
    await client.query("COMMIT");
    return formatAppointmentRow(result.rows[0]);
  } catch (error: any) {
    await client.query("ROLLBACK");
    if (error instanceof ClientError) throw error;
    if (error.code === PostgresErrorCode.UNIQUE_VIOLATION) {
      throw new ClientError(
        AppointmentErrorMessages.APPOINTMENT_SLOT_TAKEN,
        409
      );
    }
    throw new SystemError(SystemErrorMessages.DB_QUERY_FAILED, error);
  } finally {
    client.release();
  }
}

export async function removeAppointment(
  input: RemoveAppointmentInput
): Promise<Appointment | null> {
  const { appointmentId } = input;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const appointmentResult = await client.query(
      `SELECT * FROM Appointments WHERE id = $1`,
      [appointmentId]
    );

    if (appointmentResult.rows.length === 0) {
      throw new ClientError(
        AppointmentErrorMessages.APPOINTMENT_NOT_FOUND,
        404
      );
    }
    const appointmentData = appointmentResult.rows[0];

    // Restore availability if it's not already terminal
    const isCurrentlyActive = !["Cancelled", "Denied"].includes(appointmentData.status);

    await client.query(
      `UPDATE Appointments SET status = 'Cancelled' WHERE id = $1`,
      [appointmentId]
    );

    if (isCurrentlyActive) {
      await addDoctorAvailability({
        doctorId: appointmentData.doctor_id,
        availabilities: [
          appointmentData.appointment_datetime.toISOString(),
        ],
      });
    }

    await client.query("COMMIT");
    return formatAppointmentRow(appointmentData);
  } catch (error) {
    await client.query("ROLLBACK");

    if (error instanceof ClientError || error instanceof SystemError) {
      throw error;
    }
    throw new SystemError(SystemErrorMessages.DB_TRANSACTION_FAILED, error);
  } finally {
    client.release();
  }
}


async function syncHealthRecords(
  client: PoolClient,
  petId: string,
  tableName: "Health_Records_Lifelong" | "Health_Records_Active",
  incomingRecords: Array<LifelongConditionInput | ActiveTreatmentInput> = [],
  isLifelong: boolean = true
): Promise<void> {
  try {
    const { rows: existingDbRecords } = await client.query<{ id: string }>(
      `SELECT id, condition FROM ${tableName} WHERE pet_id = $1`,
      [petId]
    );

    const existingDbIds = new Set(existingDbRecords.map((r: any) => r.id));
    const seenIds = new Set<string>();

    for (const record of incomingRecords) {
      if ("id" in record && record.id) {
        seenIds.add(record.id);
        if (existingDbIds.has(record.id)) {
          const query = isLifelong
            ? `UPDATE ${tableName} SET condition = $1, treatment = $2 WHERE id = $3 AND pet_id = $4`
            : `UPDATE ${tableName} SET condition = $1, treatment = $2, start_date = $3, end_date = $4 WHERE id = $5 AND pet_id = $6`;

          const params = isLifelong
            ? [record.condition, record.treatment, record.id, petId]
            : [
                record.condition,
                record.treatment,
                (record as ActiveTreatmentInput).start_date,
                (record as ActiveTreatmentInput).end_date,
                record.id,
                petId,
              ];

          await client.query(query, params);
        }
      } else {
        const query = isLifelong
          ? `INSERT INTO ${tableName} (pet_id, condition, treatment) VALUES ($1, $2, $3)`
          : `INSERT INTO ${tableName} (pet_id, condition, treatment, start_date, end_date) VALUES ($1, $2, $3, $4, $5)`;

        const params = isLifelong
          ? [petId, record.condition, record.treatment]
          : [
              petId,
              record.condition,
              record.treatment,
              (record as ActiveTreatmentInput).start_date,
              (record as ActiveTreatmentInput).end_date,
            ];

        try {
          await client.query(query, params);
        } catch (e: any) {
          if (e.code === PostgresErrorCode.UNIQUE_VIOLATION) {
            throw new ClientError(
              PetErrorMessages.CONDITION_ALREADY_EXISTS.replace(
                "{condition}",
                record.condition
              ),
              400
            );
          }
          throw e;
        }
      }
    }

    const idsToDelete = [...existingDbIds].filter((id) => !seenIds.has(id));
    if (idsToDelete.length > 0) {
      await client.query(
        `DELETE FROM ${tableName} WHERE id = ANY($1::uuid[])`,
        [idsToDelete]
      );
    }
  } catch (error) {
    if (error instanceof ClientError || error instanceof SystemError) {
      throw error;
    }
    throw new SystemError(SystemErrorMessages.DB_QUERY_FAILED, error);
  }
}

export async function updateAppointment(
  input: UpdateAppointmentInput
): Promise<Appointment | null> {
  const {
    appointmentId,
    status,
    reason,
    consultationType,
    investigation,
    investigationResult,
    patientDetails,
    lifelongConditions,
    activeTreatments,
  } = input;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const appointmentRes = await client.query(
      `SELECT pet_id, doctor_id, appointment_datetime, status FROM Appointments WHERE id = $1`,
      [appointmentId]
    );
    if (appointmentRes.rows.length === 0) {
      throw new ClientError(
        AppointmentErrorMessages.APPOINTMENT_NOT_FOUND,
        404
      );
    }
    const { pet_id, doctor_id, appointment_datetime, status: oldStatus } = appointmentRes.rows[0];

    if (
      status ||
      reason ||
      consultationType ||
      investigation ||
      investigationResult
    ) {
      await client.query(
        `UPDATE Appointments 
         SET status = COALESCE($2, status),
             reason = COALESCE($3, reason),
             consultation_type = COALESCE($4, consultation_type),
             investigation = COALESCE($5, investigation),
             investigation_result = COALESCE($6, investigation_result)
         WHERE id = $1`,
        [
          appointmentId,
          status,
          reason,
          consultationType,
          investigation,
          investigationResult,
        ]
      );

      // If status changed to Cancelled or Denied, restore availability
      const wasActive = !["Cancelled", "Denied"].includes(oldStatus);
      const isBecomingInactive = ["Cancelled", "Denied"].includes(status ?? "");

      if (wasActive && isBecomingInactive) {
        await addDoctorAvailability({
          doctorId: doctor_id,
          availabilities: [new Date(appointment_datetime).toISOString()],
        });
      }
    }

    if (patientDetails) {
      await client.query(
        `UPDATE Pets 
         SET name = COALESCE($2, name),
             type = COALESCE($3, type),
             breed = COALESCE($4, breed),
             age = COALESCE($5, age),
             weight = COALESCE($6, weight)
         WHERE id = $1`,
        [
          pet_id,
          patientDetails.name,
          patientDetails.type,
          patientDetails.breed,
          patientDetails.age,
          patientDetails.weight,
        ]
      );
    }

    await syncHealthRecords(
      client,
      pet_id,
      "Health_Records_Lifelong",
      lifelongConditions ?? [],
      true
    );
    await syncHealthRecords(
      client,
      pet_id,
      "Health_Records_Active",
      activeTreatments ?? [],
      false
    );

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

  return getAppointmentById(appointmentId);
}
