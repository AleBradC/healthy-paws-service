import * as Sentry from "@sentry/node";
import { AuditRepository } from "./audit.repository";
import { AuditEventInput } from "./audit.types";


export class AuditService {
  constructor(private readonly repo: AuditRepository) {}

  public record(event: AuditEventInput): void {
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
