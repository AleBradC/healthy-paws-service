import type { ApolloServerPlugin } from "@apollo/server";
import type { GraphQLContext } from "../loaders";
import { auditService, AuditAction } from "../../features/audit";


const expectedErrorCodes = new Set([
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "BAD_USER_INPUT",
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
          console.error("auditMutations plugin failure:", err);
        }
      },
    };
  },
};
