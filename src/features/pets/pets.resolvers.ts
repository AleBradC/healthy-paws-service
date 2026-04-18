import { createPet, updatePet } from "./pets.repository";
import { GraphQLContext } from "../../schema/loaders";
import { Pet } from "../../types";
import { verifyPetOwnership, verifyOwnerOwnership } from "../../core/utils/authorization.utils";
import {
  GetByIdArgs,
  CreatePetArgs,
  UpdatePetArgs,
} from "../../schema/resolvers.types";

export const petsResolvers = {
  Query: {
    pet: async (_: any, { id }: GetByIdArgs, context: GraphQLContext) => {
      await verifyPetOwnership(context.user!.id, id);
      return context.petLoaders.petById.load(id);
    },
  },

  Mutation: {
    createPet: async (_: any, { input }: CreatePetArgs, context: GraphQLContext) => {
      await verifyOwnerOwnership(context.user!.id, input.ownerId);
      return createPet(input);
    },
    updatePet: async (_: any, { input }: UpdatePetArgs, context: GraphQLContext) => {
      await verifyPetOwnership(context.user!.id, input.petId);
      return updatePet(input);
    },
  },

  Pet: {
    owner: (pet: Pet, _args: any, context: GraphQLContext) =>
      context.petLoaders.ownerByPetId.load(pet.id),
    appointments: (pet: Pet, _: any, context: GraphQLContext) =>
      context.petLoaders.appointmentsByPetId.load(pet.id),
    lifelong_conditions: (pet: Pet, _args: any, context: GraphQLContext) =>
      context.petLoaders.lifelongConditionsByPetId.load(pet.id),
    active_treatments: (pet: Pet, _args: any, context: GraphQLContext) =>
      context.petLoaders.activeTreatmentsByPetId.load(pet.id),
  },
};
