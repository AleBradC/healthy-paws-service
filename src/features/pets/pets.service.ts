import { createPet, updatePet, verifyPetOwnership, verifyPetAccess } from "./pets.repository";
import { verifyOwnerOwnership } from "../../core/utils/authorization.utils";
import { CreatePetInput, UpdatePetInput } from "../../schema/resolvers.types";

export const petsService = {
  getPet: async (id: string, userId: string, userRole: string) => {
    await verifyPetAccess(userId, userRole, id);
    return id;
  },

  createPet: async (input: CreatePetInput, userId: string) => {
    await verifyOwnerOwnership(userId, input.ownerId);
    return createPet(input);
  },

  updatePet: async (input: UpdatePetInput, userId: string) => {
    await verifyPetOwnership(userId, input.petId);
    return updatePet(input);
  },
};
