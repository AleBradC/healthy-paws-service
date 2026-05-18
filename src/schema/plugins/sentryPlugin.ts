import type { ApolloServerPlugin } from "@apollo/server";
import * as Sentry from "@sentry/node";
import type { GraphQLContext } from "../loaders";

// Forward unexpected GraphQL errors to Sentry.
//
// Apollo's `formatError` hook runs for every error that leaves the resolver
// chain. We do NOT want to spam Sentry with expected, user-facing errors
// (validation, authn, authz, rate-limit) — they're not bugs. We DO want
// the unclassified ones, which surface as INTERNAL_SERVER_ERROR.
//
// The error.extensions.code convention is set everywhere we throw a
// GraphQLError manually; anything without an extensions.code is an
// unhandled bug.

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
              // The full query is useful but can be PII-laden; redact in
              // production by tightening Sentry's data scrubbing rules.
              query: requestContext.request.query,
            },
          });
        }
      },
    };
  },
};
