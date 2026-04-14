import { createPet, updatePet } from "./pets.repository";
import { GraphQLContext } from "../../schema/loaders";
import { Pet } from "../../types";
import {
  GetByIdArgs,
  CreatePetArgs,
  UpdatePetArgs,
} from "../../schema/resolvers.types";

export const petsResolvers = {
  Query: {
    pet: (_: any, { id }: GetByIdArgs, context: GraphQLContext) =>
      context.petLoaders.petById.load(id),
  },

  Mutation: {
    createPet: (_: any, { input }: CreatePetArgs) => createPet(input),
    updatePet: (_: any, { input }: UpdatePetArgs) => updatePet(input),
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
