import DataLoader from "dataloader";
import pool from "../../core/config/db";
import { Owner } from "../../core/utils/types";

async function batchOwners(ids: readonly string[]): Promise<(Owner | null)[]> {
  const query = `SELECT * FROM Owners WHERE id = ANY($1);`;
  const result = await pool.query(query, [ids]);

  const ownersMap = new Map(
    result.rows.map((owners: any) => [owners.id, owners]),
  );
  return ids.map((id) => ownersMap.get(id) || null);
}

export function createOwnerLoaders() {
  return {
    ownerById: new DataLoader(batchOwners),
  };
}
