import type { ApolloServerPlugin } from "@apollo/server";
import type { GraphQLContext } from "../loaders";
import { auditService, AuditAction } from "../../features/audit";

// Audit every GraphQL mutation outcome. Queries are skipped — they are
// idempotent reads and would 100x the audit volume for negligible forensic
// value.
//
// We log at willSendResponse so we have both the resolved operation name and
// the final error state available. The plugin never throws — auditService
// itself is fire-and-forget, but we still guard against bugs in here.

const expectedErrorCodes = new Set([
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "BAD_USER_INPUT",
  "EMAIL_NOT_VERIFIED",
]);

export const auditMutations: ApolloServerPlugin<GraphQLContext> = {
  async requestDidStart() {
    return {
      async willSendResponse(ctx) {
        try {
          if (ctx.operation?.operation !== "mutation") return;

          const errors = ctx.errors ?? [];
          const denied = errors.some((e) => {
            const code = e.extensions?.code as string | undefined;
            return code === "FORBIDDEN" || code === "UNAUTHENTICATED";
          });
          const failed = errors.length > 0;

          const action = failed
            ? denied
              ? AuditAction.AuthzDeny
              : AuditAction.MutationFailure
            : AuditAction.MutationSuccess;

          const outcome = denied ? "denied" : failed ? "failure" : "success";

          // Surface only the first error code in metadata; full error
          // payloads can contain PII and would inflate the row.
          const firstCode = errors[0]?.extensions?.code as string | undefined;
          const isExpected = firstCode && expectedErrorCodes.has(firstCode);

          auditService.record({
            action,
            outcome,
            actorUserId: ctx.contextValue.user?.id ?? null,
            actorRole: ctx.contextValue.user?.role ?? null,
            ip: ctx.contextValue.audit?.ip ?? null,
            userAgent: ctx.contextValue.audit?.userAgent ?? null,
            targetType: "graphql",
            targetId: ctx.operationName ?? null,
            metadata: failed
              ? {
                  errorCode: firstCode ?? "UNKNOWN",
                  expected: Boolean(isExpected),
                }
              : null,
          });
        } catch (err) {
          // Plugin-internal failure must not break the response.
          console.error("auditMutations plugin failure:", err);
        }
      },
    };
  },
};
