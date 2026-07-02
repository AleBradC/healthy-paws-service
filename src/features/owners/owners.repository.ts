import pool from "../../core/config/db";
import { UpdateOwnerProfileInput } from "../../schema/resolvers.types";
import { ClientError } from "../../errors/ClientError";
import { SystemError } from "../../errors/SystemError";
import {
  OwnerErrorMessages,
  SystemErrorMessages,
} from "../../errors/constants";
import { Pet, Owner } from "../../core/utils/types";

export async function getOwnerEmail(ownerId: string): Promise<string | null> {
  const query = `SELECT email FROM Users WHERE id = $1;`;
  try {
    const result = await pool.query(query, [ownerId]);
    return result.rows[0]?.email || null;
  } catch (err) {
    throw new SystemError(SystemErrorMessages.DB_QUERY_FAILED, err);
  }
}

export async function getPetsByOwner(ownerId: string): Promise<Pet[]> {
  const query = `SELECT id, name, type, breed, age, weight, owner_id FROM Pets WHERE owner_id = $1;`;
  try {
    const result = await pool.query(query, [ownerId]);
    return result.rows.map((row: any) => ({
      ...row,
      weight: parseFloat(row.weight),
    }));
  } catch (err) {
    throw new SystemError(SystemErrorMessages.DB_QUERY_FAILED, err);
  }
}

export async function updateOwnerProfile(
  input: UpdateOwnerProfileInput,
): Promise<Owner | null> {
  const { name, ownerId } = input;

  const query = `
    UPDATE Owners
    SET name = $1
    WHERE id = $2
    RETURNING id, name;
  `;

  try {
    const result = await pool.query(query, [name, ownerId]);

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
