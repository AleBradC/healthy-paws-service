import pool from "../../core/config/db";
import { AuditRepository } from "./audit.repository";
import { AuditService } from "./audit.service";

const auditRepository = new AuditRepository(pool);
export const auditService = new AuditService(auditRepository);

export { AuditService } from "./audit.service";
export { AuditRepository } from "./audit.repository";
export { AuditAction } from "./audit.types";
export type { AuditEventInput, AuditOutcome } from "./audit.types";
