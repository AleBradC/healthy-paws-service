import * as Sentry from "@sentry/node";
import { AuditRepository } from "./audit.repository";
import { AuditEventInput } from "./audit.types";

// Best-effort, fire-and-forget audit logger.
//
// Critical design property: a failure to write an audit row must NEVER cause
// the parent request to fail. Auth, payment, and other user-visible flows
// have to stay up even if the audit table is full or the audit insert
// deadlocks. We swallow errors here and forward them to Sentry so the
// regression is visible without breaking the user.
//
// Trade-off: under sustained DB failure we lose audit visibility. That is
// acceptable for an MVP — when audit volume grows, swap this for a
// message-queue producer (SQS, Redis Stream) consumed by a worker.

export class AuditService {
  constructor(private readonly repo: AuditRepository) {}

  public record(event: AuditEventInput): void {
    // We deliberately do NOT await. Awaiting would couple p99 latency of
    // every audited request to the audit insert. The promise rejection is
    // caught locally so it cannot escape into an unhandledRejection.
    this.repo.insert(event).catch((err) => {
      console.error("Audit write failed:", {
        action: event.action,
        outcome: event.outcome,
        err: err instanceof Error ? err.message : String(err),
      });
      Sentry.captureException(err, {
        tags: { error_class: "AuditWriteFailed", action: event.action },
      });
    });
  }
}
