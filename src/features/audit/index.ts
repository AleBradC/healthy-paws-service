import pool from "../../core/config/db";
import { AuditRepository } from "./audit.repository";
import { AuditService } from "./audit.service";

// Singleton instance. We construct it lazily at module load (not on first
// call) so the import order is deterministic and so it's available to the
// audit middleware before any request lands.
//
// Using a singleton instead of dependency-injecting AuditService into every
// controller keeps the existing controller signatures unchanged. The audit
// concern is genuinely cross-cutting and benefits from a small singleton.
const auditRepository = new AuditRepository(pool);
export const auditService = new AuditService(auditRepository);

export { AuditService } from "./audit.service";
export { AuditRepository } from "./audit.repository";
export { AuditAction } from "./audit.types";
export type { AuditEventInput, AuditOutcome } from "./audit.types";
