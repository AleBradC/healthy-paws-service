import { Pool } from "pg";
import { AuditEventInput } from "./audit.types";

export class AuditRepository {
  constructor(private readonly db: Pool) {}

  public async insert(event: AuditEventInput): Promise<void> {
    await this.db.query(
      `INSERT INTO AuditEvents
         (actor_user_id, actor_role, ip, user_agent,
          action, target_type, target_user_id, target_id,
          outcome, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        event.actorUserId ?? null,
        event.actorRole ?? null,
        event.ip ?? null,
        event.userAgent ?? null,
        event.action,
        event.targetType ?? null,
        event.targetUserId ?? null,
        event.targetId ?? null,
        event.outcome,
        event.metadata ? JSON.stringify(event.metadata) : null,
      ]
    );
  }
}
