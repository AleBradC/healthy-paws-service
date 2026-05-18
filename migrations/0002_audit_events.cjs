/* eslint-disable camelcase */

// F-26: forensic trail. Append-only table — never UPDATE or DELETE rows.
// Retention is enforced by a separate cron job (out of scope here).
//
// Schema decisions:
//   - actor_user_id is NULLABLE because login.failure events legitimately have
//     no actor (the request never authenticated).
//   - target_user_id is NULLABLE for the same reason and for system-level
//     events that do not target a specific user.
//   - metadata JSONB stores per-event context (rate-limit window, IP, etc.)
//     without polluting the column schema each time we add a new event type.
//   - The two indexes are sized for the only two read patterns we expect:
//       1. "Show me everything actor X did" (admin investigation)
//       2. "Show me every login.failure in the last hour" (anomaly triage)

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS AuditEvents (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      actor_user_id UUID NULL REFERENCES Users(id) ON DELETE SET NULL,
      actor_role VARCHAR(50) NULL,
      ip VARCHAR(64) NULL,
      user_agent TEXT NULL,
      action VARCHAR(64) NOT NULL,
      target_type VARCHAR(64) NULL,
      target_user_id UUID NULL REFERENCES Users(id) ON DELETE SET NULL,
      target_id VARCHAR(128) NULL,
      outcome VARCHAR(32) NOT NULL CHECK (outcome IN ('success','failure','denied')),
      metadata JSONB NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_actor_time
      ON AuditEvents (actor_user_id, occurred_at DESC);

    CREATE INDEX IF NOT EXISTS idx_audit_action_time
      ON AuditEvents (action, occurred_at DESC);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_audit_action_time;
    DROP INDEX IF EXISTS idx_audit_actor_time;
    DROP TABLE IF EXISTS AuditEvents;
  `);
};
