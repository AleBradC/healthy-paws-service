import {
  getAllOwners,
  getOwnerEmail,
  getPetsByOwner,
  updateOwnerProfile,
} from "./owners.repository";
import { GraphQLContext } from "../../schema/loaders";
import { Owner } from "../../types";
import { verifyOwnerOwnership } from "../../core/utils/authorization.utils";
import {
  GetByIdArgs,
  UpdateOwnerProfileArgs,
} from "../../schema/resolvers.types";

export const ownersResolvers = {
  Query: {
    owners: () => getAllOwners(),
    owner: async (_: any, { id }: GetByIdArgs, context: GraphQLContext) => {
      await verifyOwnerOwnership(context.user!.id, id);
      return context.ownerLoaders.ownerById.load(id);
    },
  },

  Mutation: {
    updateOwnerProfile: async (_: any, { input }: UpdateOwnerProfileArgs, context: GraphQLContext) => {
      await verifyOwnerOwnership(context.user!.id, input.ownerId);
      return updateOwnerProfile(input);
    },
  },

  Owner: {
    email: (owner: Owner) => getOwnerEmail(owner.user_id),
    pets: (owner: Owner) => getPetsByOwner(owner.id),
  },
};
