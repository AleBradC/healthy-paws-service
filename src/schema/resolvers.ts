import { appointmentsResolvers } from "../features/appointments/appointments.resolvers";
import { doctorsResolvers } from "../features/doctors/doctors.resolvers";
import { ownersResolvers } from "../features/owners/owners.resolvers";
import { petsResolvers } from "../features/pets/pets.resolvers";
import { GraphQLContext } from "./loaders";
import { GraphQLError } from "graphql";

const requireAuth = (resolverFn: any) => {
  return (parent: any, args: any, context: GraphQLContext, info: any) => {
    if (!context.user) {
      throw new GraphQLError("You must be logged in to perform this action", {
        extensions: { code: "UNAUTHENTICATED" },
      });
    }
    return resolverFn(parent, args, context, info);
  };
};

const wrapResolvers = (resolversObj: any) => {
  const wrapped: any = {};
  for (const key in resolversObj) {
    wrapped[key] = requireAuth(resolversObj[key]);
  }
  return wrapped;
};

export const resolvers = {
  Query: {
    ...wrapResolvers(appointmentsResolvers.Query),
    ...wrapResolvers(doctorsResolvers.Query),
    ...wrapResolvers(ownersResolvers.Query),
    ...wrapResolvers(petsResolvers.Query),
  },
  Mutation: {
    ...wrapResolvers(appointmentsResolvers.Mutation),
    ...wrapResolvers(doctorsResolvers.Mutation),
    ...wrapResolvers(ownersResolvers.Mutation),
    ...wrapResolvers(petsResolvers.Mutation),
  },
  // Type resolvers
  Doctor: doctorsResolvers.Doctor,
  Specialization: doctorsResolvers.Specialization,
  Owner: ownersResolvers.Owner,
  Pet: petsResolvers.Pet,
  Appointment: appointmentsResolvers.Appointment,
};
