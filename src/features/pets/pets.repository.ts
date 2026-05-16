import { GraphQLError } from "graphql";
import pool from "../../core/config/db";
import { CreatePetInput, UpdatePetInput } from "../../schema/resolvers.types";
import {
  ActiveTreatment,
  Appointment,
  LifelongCondition,
  Owner,
  Pet,
} from "../../types";
import { ClientError } from "../../errors/ClientError";
import { SystemError } from "../../errors/SystemError";
import {
  PetErrorMessages,
  OwnerErrorMessages,
  SystemErrorMessages,
} from "../../errors/constants";

/**
 * Verifies that a pet record belongs to the specified owner.
 * The roleId from the token is the ownerId.
 */
export async function verifyPetOwnership(roleId: string, petId: string): Promise<void> {
  const query = `
    SELECT 1 
    FROM Pets 
    WHERE id = $1 AND owner_id = $2;
  `;
  const result = await pool.query(query, [petId, roleId]);

  if (result.rowCount === 0) {
    throw new GraphQLError("You do not have permission to modify this pet record.", {
      extensions: { code: "FORBIDDEN" },
    });
  }
}

export async function getPetById(petId: string): Promise<Pet | null> {
  const query = `SELECT * FROM Pets WHERE id = $1;`;

  try {
    const result = await pool.query(query, [petId]);

    if (result.rows.length === 0) {
      throw new ClientError(PetErrorMessages.PET_NOT_FOUND, 404);
    }

    const petRow = result.rows[0];
    return {
      ...petRow,
      weight: parseFloat(petRow.weight),
    };
  } catch (err) {
    if (err instanceof ClientError || err instanceof SystemError) {
      throw err;
    }
    throw new SystemError(SystemErrorMessages.DB_QUERY_FAILED, err);
  }
}

export async function getOwnerByPet(petId: string): Promise<Owner | null> {
  const query = `
    SELECT o.id, o.name, o.user_id 
    FROM Owners o 
    JOIN Pets p ON o.id = p.owner_id 
    WHERE p.id = $1;
  `;

  try {
    const result = await pool.query(query, [petId]);

    if (result.rows.length === 0) {
      throw new ClientError(OwnerErrorMessages.OWNER_NOT_FOUND, 404);
    }

    return result.rows[0];
  } catch (err) {
    if (err instanceof ClientError || err instanceof SystemError) {
      throw err;
    }
    throw new SystemError(SystemErrorMessages.DB_QUERY_FAILED, err);
  }
}

export async function getLifelongConditionsByPet(
  petId: string
): Promise<LifelongCondition[]> {
  const query = `SELECT id, condition, treatment FROM Health_Records_Lifelong WHERE pet_id = $1;`;

  try {
    const result = await pool.query(query, [petId]);
    return result.rows || [];
  } catch (err) {
    throw new SystemError(SystemErrorMessages.DB_QUERY_FAILED, err);
  }
}

export async function getActiveTreatmentsByPet(
  petId: string
): Promise<ActiveTreatment[]> {
  const query = `SELECT id, condition, treatment, start_date, end_date FROM Health_Records_Active WHERE pet_id = $1;`;

  try {
    const result = await pool.query(query, [petId]);

    if (!result.rows) {
      return [];
    }

    return result.rows.map((row: any) => ({
      ...row,
      start_date: row.start_date.toISOString(),
      end_date: row.end_date ? row.end_date.toISOString() : undefined,
    }));
  } catch (err) {
    throw new SystemError(SystemErrorMessages.DB_QUERY_FAILED, err);
  }
}

export async function getAppointmentsByPet(
  petId: string
): Promise<Appointment[]> {
  const query = `
    SELECT id, appointment_datetime, status, doctor_id, pet_id
    FROM Appointments
    WHERE pet_id = $1
    ORDER BY appointment_datetime DESC;
  `;

  try {
    const result = await pool.query(query, [petId]);

    return result.rows.map((row: any) => ({
      ...row,
      datetime: row.appointment_datetime.toISOString(),
    }));
  } catch (err) {
    throw new SystemError(SystemErrorMessages.DB_QUERY_FAILED, err);
  }
}

export async function createPet(input: CreatePetInput): Promise<Pet> {
  const { ownerId, name, type, breed, age, weight } = input;

  const query = `
    INSERT INTO Pets (owner_id, name, type, breed, age, weight)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;

  try {
    const result = await pool.query(query, [
      ownerId,
      name,
      type,
      breed,
      age,
      weight,
    ]);

    const newPet = result.rows[0];
    return {
      ...newPet,
      weight: parseFloat(newPet.weight),
    };
  } catch (err) {
    throw new SystemError(SystemErrorMessages.DB_QUERY_FAILED, err);
  }
}

export async function updatePet(input: UpdatePetInput): Promise<Pet | null> {
  const { petId, ...fieldsToUpdate } = input;

  const fieldEntries = Object.entries(fieldsToUpdate).filter(
    ([, value]) => value !== undefined
  );

  if (fieldEntries.length === 0) {
    return getPetById(petId);
  }

  const setClauses = fieldEntries.map(
    ([key], index) => `${key} = $${index + 1}`
  );
  const values = fieldEntries.map(([, value]) => value);

  const query = `
    UPDATE Pets
    SET ${setClauses.join(", ")}
    WHERE id = $${values.length + 1}
    RETURNING id, name, type, breed, age, weight, owner_id;
  `;

  try {
    const result = await pool.query(query, [...values, petId]);

    if (result.rows.length === 0) {
      throw new ClientError(PetErrorMessages.PET_NOT_FOUND, 404);
    }

    const updatedPet = result.rows[0];
    return {
      ...updatedPet,
      weight: parseFloat(updatedPet.weight),
    };
  } catch (err) {
    if (err instanceof ClientError || err instanceof SystemError) {
      throw err;
    }
    throw new SystemError(SystemErrorMessages.DB_QUERY_FAILED, err);
  }
}
