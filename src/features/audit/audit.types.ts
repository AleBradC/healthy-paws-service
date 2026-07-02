
export enum AuditAction {
  LoginSuccess = "login.success",
  LoginFailure = "login.failure",
  Logout = "logout",
  PasswordResetRequested = "password.reset.requested",
  PasswordResetCompleted = "password.reset.completed",
  AuthzDeny = "authz.deny",
  MutationSuccess = "mutation.success",
  MutationFailure = "mutation.failure",
}

export type AuditOutcome = "success" | "failure" | "denied";

export interface AuditEventInput {
  action: AuditAction;
  outcome: AuditOutcome;
  actorUserId?: string | null;
  actorRole?: string | null;
  targetUserId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}
