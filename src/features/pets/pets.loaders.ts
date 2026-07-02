import DataLoader from "dataloader";
import pool from "../../core/config/db";
import {
  Pet,
  Owner,
  Appointment,
  LifelongCondition,
  ActiveTreatment,
} from "../../core/utils/types";

async function batchPets(ids: readonly string[]): Promise<(Pet | null)[]> {
  const query = `SELECT * FROM Pets WHERE id = ANY($1);`;
  const result = await pool.query(query, [ids]);

  const petMap = new Map(result.rows.map((pet: any) => [pet.id, pet]));
  return ids.map((id) => petMap.get(id) || null);
}

async function batchOwnersByPetIds(
  petIds: readonly string[],
): Promise<(Owner | null)[]> {
  if (petIds.length === 0) return [];

  const result = await pool.query(
    `
    SELECT o.id, o.name, p.id AS pet_id
    FROM Owners o
    JOIN Pets p ON o.id = p.owner_id
    WHERE p.id = ANY($1);
    `,
    [petIds],
  );

  const petIdToOwner = new Map<string, Owner>();
  for (const row of result.rows) {
    petIdToOwner.set(row.pet_id, {
      id: row.id,
      name: row.name,
    });
  }

  return petIds.map((petId) => petIdToOwner.get(petId) || null);
}

async function batchAppointmentsByPetIds(
  petIds: readonly string[],
): Promise<Appointment[][]> {
  const result = await pool.query(
    `SELECT id, appointment_datetime, status, doctor_id, pet_id
     FROM Appointments
     WHERE pet_id = ANY($1)
     ORDER BY appointment_datetime DESC`,
    [petIds],
  );

  const map = new Map<string, Appointment[]>();
  petIds.forEach((id) => map.set(id, []));

  for (const row of result.rows) {
    map.get(row.pet_id)!.push({
      ...row,
      datetime: row.appointment_datetime.toISOString(),
    });
  }

  return petIds.map((id) => map.get(id) || []);
}

async function batchLifelongConditionsByPetIds(
  petIds: readonly string[],
): Promise<LifelongCondition[][]> {
  const result = await pool.query(
    `SELECT id, condition, treatment, pet_id FROM Health_Records_Lifelong WHERE pet_id = ANY($1);`,
    [petIds],
  );

  const map = new Map<string, LifelongCondition[]>();
  petIds.forEach((id) => map.set(id, []));

  for (const row of result.rows) {
    map.get(row.pet_id)!.push({
      id: row.id,
      condition: row.condition,
      treatment: row.treatment,
    });
  }

  return petIds.map((id) => map.get(id) || []);
}

async function batchActiveTreatmentsByPetIds(
  petIds: readonly string[],
): Promise<ActiveTreatment[][]> {
  const result = await pool.query(
    `SELECT id, condition, treatment, start_date, end_date, pet_id FROM Health_Records_Active WHERE pet_id = ANY($1);`,
    [petIds],
  );

  const map = new Map<string, ActiveTreatment[]>();
  petIds.forEach((id) => map.set(id, []));

  for (const row of result.rows) {
    map.get(row.pet_id)!.push({
      id: row.id,
      condition: row.condition,
      treatment: row.treatment,
      start_date: row.start_date.toISOString(),
      end_date: row.end_date ? row.end_date.toISOString() : undefined,
    });
  }

  return petIds.map((id) => map.get(id) || []);
}

export function createPetLoaders() {
  return {
    petById: new DataLoader(batchPets),
    ownerByPetId: new DataLoader(batchOwnersByPetIds),
    appointmentsByPetId: new DataLoader(batchAppointmentsByPetIds),
    lifelongConditionsByPetId: new DataLoader(batchLifelongConditionsByPetIds),
    activeTreatmentsByPetId: new DataLoader(batchActiveTreatmentsByPetIds),
  };
}
