import DataLoader from "dataloader";
import pool from "../../core/config/db";
import { Doctor, Specialization, Service } from "../../core/utils/types";

async function batchDoctors(
  ids: readonly string[],
): Promise<(Doctor | null)[]> {
  const result = await pool.query(`SELECT * FROM Doctors WHERE id = ANY($1)`, [
    ids,
  ]);
  const doctorMap = new Map(result.rows.map((doc) => [doc.id, doc]));
  return ids.map((id) => doctorMap.get(id) || null);
}

async function batchSpecializationsByDoctor(
  doctorIds: readonly string[],
): Promise<Specialization[][]> {
  const result = await pool.query(
    `SELECT s.*, ds.doctor_id FROM Specializations s
     JOIN Doctor_Specializations ds ON s.id = ds.specialization_id
     WHERE ds.doctor_id = ANY($1)`,
    [doctorIds],
  );
  const map = new Map<string, Specialization[]>();
  doctorIds.forEach((id) => map.set(id, []));
  for (const row of result.rows) {
    map.get(row.doctor_id)!.push(row);
  }
  return doctorIds.map((id) => map.get(id)!);
}

async function batchServicesByDoctorAndSpecialization(
  keys: readonly { doctorId: string; specializationId: string }[],
): Promise<Service[][]> {
  if (keys.length === 0) return [];

  const validKeys = keys.filter(
    (k) => k.doctorId !== undefined && k.specializationId !== undefined,
  );

  if (validKeys.length === 0) {
    return keys.map(() => []);
  }

  const doctorIds = Array.from(new Set(validKeys.map((k) => k.doctorId)));

  const result = await pool.query(
    `SELECT s.id, dsp.specialization_id, s.name, dsp.price, dsp.doctor_id
     FROM Doctor_Service_Pricing dsp
     JOIN Services s ON dsp.service_id = s.id
     WHERE dsp.doctor_id = ANY($1)`,
    [doctorIds],
  );

  const map = new Map<string, Service[]>();

  for (const { doctor_id, specialization_id, ...service } of result.rows) {
    const key = `${doctor_id}:${specialization_id}`;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push({ ...service, price: parseFloat(service.price) });
  }

  return keys.map(({ doctorId, specializationId }) => {
    if (doctorId === undefined || specializationId === undefined) {
      return [];
    }
    return map.get(`${doctorId}:${specializationId}`) || [];
  });
}

export function createDoctorLoaders() {
  return {
    doctorById: new DataLoader(batchDoctors),
    specializationsByDoctor: new DataLoader(batchSpecializationsByDoctor),
    servicesByDoctorAndSpecialization: new DataLoader(
      batchServicesByDoctorAndSpecialization,
    ),
  };
}
