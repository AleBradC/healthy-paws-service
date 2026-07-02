import type { ApolloServerPlugin } from "@apollo/server";
import * as Sentry from "@sentry/node";
import type { GraphQLContext } from "../loaders";


const EXPECTED_CODES = new Set([
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "BAD_USER_INPUT",
  "GRAPHQL_VALIDATION_FAILED",
  "GRAPHQL_PARSE_FAILED",
  "PERSISTED_QUERY_NOT_FOUND",
  "PERSISTED_QUERY_NOT_SUPPORTED",
]);

export const sentryPlugin: ApolloServerPlugin<GraphQLContext> = {
  async requestDidStart(requestContext) {
    return {
      async didEncounterErrors(ctx) {
        for (const error of ctx.errors) {
          const code = error.extensions?.code as string | undefined;
          if (code && EXPECTED_CODES.has(code)) continue;

          Sentry.captureException(error.originalError ?? error, {
            tags: {
              error_class: "GraphQL",
              code: code ?? "UNKNOWN",
              operation: ctx.operation?.operation ?? "unknown",
              operation_name: ctx.operationName ?? "anonymous",
            },
            extra: {
              path: error.path?.join(".") ?? null,
              query: requestContext.request.query,
            },
          });
        }
      },
    };
  },
};
