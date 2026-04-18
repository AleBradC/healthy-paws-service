import pool from "../config/db";
import { GraphQLError } from "graphql";

/**
 * Verifies that a doctor record belongs to the specified user.
 * The roleId from the token IS the doctorId for doctors.
 */
export async function verifyDoctorOwnership(roleId: string, doctorId: string): Promise<void> {
  if (roleId !== doctorId) {
    throw new GraphQLError("You do not have permission to modify this doctor profile.", {
      extensions: { code: "FORBIDDEN" },
    });
  }
}

/**
 * Verifies that an owner record belongs to the specified user.
 * The roleId from the token IS the ownerId for owners.
 */
export async function verifyOwnerOwnership(roleId: string, ownerId: string): Promise<void> {
  if (roleId !== ownerId) {
    throw new GraphQLError("You do not have permission to modify this owner profile.", {
      extensions: { code: "FORBIDDEN" },
    });
  }
}

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

/**
 * Verifies that an appointment belongs to the user (either the doctor or the owner of the pet).
 */
export async function verifyAppointmentOwnership(roleId: string, role: string, appointmentId: string): Promise<void> {
  let query = "";
  if (role === 'doctor') {
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
