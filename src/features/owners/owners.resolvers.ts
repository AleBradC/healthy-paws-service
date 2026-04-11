import {
  getAllOwners,
  getOwnerEmail,
  getPetsByOwner,
  updateOwnerProfile,
} from "./owners.repository";
import { GraphQLContext } from "../../schema/loaders";
import { Owner } from "../../types";
import {
  GetByIdArgs,
  UpdateOwnerProfileArgs,
} from "../../schema/resolvers.types";

export const ownersResolvers = {
  Query: {
    owners: () => getAllOwners(),
    owner: (_: any, { id }: GetByIdArgs, context: GraphQLContext) =>
      context.ownerLoaders.ownerById.load(id),
  },

  Mutation: {
    updateOwnerProfile: (_: any, { input }: UpdateOwnerProfileArgs) =>
      updateOwnerProfile(input),
  },

  Owner: {
    email: (owner: Owner) => getOwnerEmail(owner.user_id),
    pets: (owner: Owner) => getPetsByOwner(owner.id),
  },
};
