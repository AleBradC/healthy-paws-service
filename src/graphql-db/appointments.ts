import { PoolClient } from "pg";
import pool from "../core/config/db";
import {
  ActiveTreatmentInput,
  CreateAppointmentInput,
  LifelongConditionInput,
  RemoveAppointmentInput,
  UpdateAppointmentInput,
} from "../graphql/types";
import { Appointment } from "../types";
import { addDoctorAvailability } from "./doctors";
import { formatAppointmentRow } from "./helpers";
import { ClientError } from "../errors/ClientError";
import { SystemError } from "../errors/SystemError";
import {
  SystemErrorMessages,
  PostgresErrorCode,
  AppointmentErrorMessages,
  PetErrorMessages,
} from "../errors/constants";

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
  const { petId, doctorId, appointmentDatetime, status, consultationType } =
    input;

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

  try {
    const result = await pool.query(query, values);
    return formatAppointmentRow(result.rows[0]);
  } catch (error: any) {
    if (error.code === PostgresErrorCode.UNIQUE_VIOLATION) {
      throw new ClientError(
        AppointmentErrorMessages.APPOINTMENT_SLOT_TAKEN,
        409
      );
    }
    throw new SystemError(SystemErrorMessages.DB_QUERY_FAILED, error);
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
    const deletedAppointmentData = appointmentResult.rows[0];

    await client.query(`DELETE FROM Appointments WHERE id = $1`, [
      appointmentId,
    ]);
    await client.query("COMMIT");

    await addDoctorAvailability({
      doctorId: deletedAppointmentData.doctor_id,
      availabilities: [
        deletedAppointmentData.appointment_datetime.toISOString(),
      ],
    });

    return formatAppointmentRow(deletedAppointmentData);
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

    const existingDbIds = new Set(existingDbRecords.map((r) => r.id));
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
      `SELECT pet_id FROM Appointments WHERE id = $1`,
      [appointmentId]
    );
    if (appointmentRes.rows.length === 0) {
      throw new ClientError(
        AppointmentErrorMessages.APPOINTMENT_NOT_FOUND,
        404
      );
    }
    const { pet_id } = appointmentRes.rows[0];

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
