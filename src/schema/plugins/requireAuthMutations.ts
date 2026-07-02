import type { ApolloServerPlugin } from "@apollo/server";
import { GraphQLError } from "graphql";
import type { GraphQLContext } from "../loaders";

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
