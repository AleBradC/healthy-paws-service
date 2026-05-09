import { petsService } from "./pets.service";
import { GraphQLContext } from "../../schema/loaders";
import { Pet } from "../../types";
import {
  GetByIdArgs,
  CreatePetArgs,
  UpdatePetArgs,
} from "../../schema/resolvers.types";

export const petsResolvers = {
  Query: {
    pet: async (_: any, { id }: GetByIdArgs, context: GraphQLContext) => {
      const petId = await petsService.getPet(id, context.user!.id);
      return context.petLoaders.petById.load(petId);
    },
  },

  Mutation: {
    createPet: async (_: any, { input }: CreatePetArgs, context: GraphQLContext) => {
      return petsService.createPet(input, context.user!.id);
    },
    updatePet: async (_: any, { input }: UpdatePetArgs, context: GraphQLContext) => {
      return petsService.updatePet(input, context.user!.id);
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
