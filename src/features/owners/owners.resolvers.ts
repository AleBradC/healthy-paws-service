import { ownersService } from "./owners.service";
import { getOwnerEmail, getPetsByOwner } from "./owners.repository";
import { GraphQLContext } from "../../schema/loaders";
import {
  GetByIdArgs,
  UpdateOwnerProfileArgs,
} from "../../schema/resolvers.types";
import { Owner } from "../../core/utils/types";

export const ownersResolvers = {
  Query: {
    owner: async (_: any, { id }: GetByIdArgs, context: GraphQLContext) => {
      const ownerId = await ownersService.getOwner(id, context.user!.id);
      return context.ownerLoaders.ownerById.load(ownerId);
    },
  },

  Mutation: {
    updateOwnerProfile: async (
      _: any,
      { input }: UpdateOwnerProfileArgs,
      context: GraphQLContext,
    ) => {
      return ownersService.updateOwnerProfile(input, context.user!.id);
    },
  },

  Owner: {
    email: (owner: Owner) => getOwnerEmail(owner.id),
    pets: (owner: Owner) => getPetsByOwner(owner.id),
  },
};
