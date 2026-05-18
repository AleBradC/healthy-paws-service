// Canonical list of auditable actions. A small enum (vs a free-form string)
// keeps query patterns predictable — admin tooling and anomaly detection can
// pivot on this column without worrying about typos or drift.
//
// Adding a new event type:
//   1. Add the literal here.
//   2. Call auditService.record({ action: AuditAction.MyNewEvent, ... }) from
//      wherever the event originates.
//   3. Update the runbook to describe what triage on the new event looks like.
export enum AuditAction {
  LoginSuccess = "login.success",
  LoginFailure = "login.failure",
  Logout = "logout",
  PasswordResetRequested = "password.reset.requested",
  PasswordResetCompleted = "password.reset.completed",
  EmailVerificationRequested = "email.verify.requested",
  EmailVerificationCompleted = "email.verify.completed",
  AuthzDeny = "authz.deny",
  MutationSuccess = "mutation.success",
  MutationFailure = "mutation.failure",
}

export type AuditOutcome = "success" | "failure" | "denied";

export interface AuditEventInput {
  action: AuditAction;
  outcome: AuditOutcome;
  // The user performing the action. NULL for unauthenticated events such as a
  // failed login or a reset-link request.
  actorUserId?: string | null;
  actorRole?: string | null;
  // The user the action targets, when different from the actor. For password
  // reset requests this is the account whose password was requested to reset.
  targetUserId?: string | null;
  // For non-user targets: the resource type ("appointment", "pet", ...) and
  // the resource id. We keep target_id as VARCHAR so it can hold non-UUID
  // values (e.g. composite keys) without schema gymnastics.
  targetType?: string | null;
  targetId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}
