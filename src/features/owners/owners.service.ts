import { getAllOwners, updateOwnerProfile } from "./owners.repository";
import { verifyOwnerOwnership } from "../../core/utils/authorization.utils";
import { UpdateOwnerProfileInput } from "../../schema/resolvers.types";

export const ownersService = {
  getAllOwners: () => {
    return getAllOwners();
  },

  getOwner: async (id: string, userId: string) => {
    await verifyOwnerOwnership(userId, id);
    return id; // Return ID to be loaded via Dataloader by the resolver
  },

  updateOwnerProfile: async (input: UpdateOwnerProfileInput, userId: string) => {
    await verifyOwnerOwnership(userId, input.ownerId);
    return updateOwnerProfile(input);
  },
};
