import type { ApolloServerPlugin } from "@apollo/server";
import { GraphQLError } from "graphql";
import type { GraphQLContext } from "../loaders";

// didResolveOperation runs after Apollo has parsed and validated the request
// but before any resolver runs. Throwing here short-circuits the whole pipeline
// — no field resolver (not even the requireAuth wrapper) ever executes.
// The http extension makes Apollo Server v4 emit a real HTTP 401, which the
// frontend's existing errorLink already handles via its networkError branch.
export const requireAuthMutations: ApolloServerPlugin<GraphQLContext> = {
  async requestDidStart() {
    return {
      async didResolveOperation({ operation, contextValue }) {
        if (operation?.operation !== "mutation") return;
        if (contextValue.user) return;

        throw new GraphQLError(
          "You must be logged in to perform this action",
          {
            extensions: {
              code: "UNAUTHENTICATED",
              http: { status: 401 },
            },
          }
        );
      },
    };
  },
};
