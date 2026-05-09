import { ownersService } from "./owners.service";
import { getOwnerEmail, getPetsByOwner } from "./owners.repository";
import { GraphQLContext } from "../../schema/loaders";
import { Owner } from "../../types";
import {
  GetByIdArgs,
  UpdateOwnerProfileArgs,
} from "../../schema/resolvers.types";

export const ownersResolvers = {
  Query: {
    owners: () => ownersService.getAllOwners(),
    owner: async (_: any, { id }: GetByIdArgs, context: GraphQLContext) => {
      const ownerId = await ownersService.getOwner(id, context.user!.id);
      return context.ownerLoaders.ownerById.load(ownerId);
    },
  },

  Mutation: {
    updateOwnerProfile: async (_: any, { input }: UpdateOwnerProfileArgs, context: GraphQLContext) => {
      return ownersService.updateOwnerProfile(input, context.user!.id);
    },
  },

  Owner: {
    email: (owner: Owner) => getOwnerEmail(owner.user_id),
    pets: (owner: Owner) => getPetsByOwner(owner.id),
  },
};
