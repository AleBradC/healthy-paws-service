import { createPet, updatePet, verifyPetOwnership } from "./pets.repository";
import { verifyOwnerOwnership } from "../../core/utils/authorization.utils";
import { CreatePetInput, UpdatePetInput } from "../../schema/resolvers.types";

export const petsService = {
  getPet: async (id: string, userId: string) => {
    await verifyPetOwnership(userId, id);
    return id; // Returns the ID so the resolver can load it via dataloader
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
