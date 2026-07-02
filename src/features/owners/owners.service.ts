import { updateOwnerProfile } from "./owners.repository";
import { verifyOwnerOwnership } from "../../core/utils/authorization.utils";
import { UpdateOwnerProfileInput } from "../../schema/resolvers.types";

export const ownersService = {
  getOwner: async (id: string, userId: string) => {
    await verifyOwnerOwnership(userId, id);
    return id;
  },

  updateOwnerProfile: async (
    input: UpdateOwnerProfileInput,
    userId: string,
  ) => {
    await verifyOwnerOwnership(userId, input.ownerId);
    return updateOwnerProfile(input);
  },
};
