import { appointmentsResolvers } from "../features/appointments/appointments.resolvers";
import { doctorsResolvers } from "../features/doctors/doctors.resolvers";
import { ownersResolvers } from "../features/owners/owners.resolvers";
import { petsResolvers } from "../features/pets/pets.resolvers";

export const resolvers = {
  Query: {
    ...appointmentsResolvers.Query,
    ...doctorsResolvers.Query,
    ...ownersResolvers.Query,
    ...petsResolvers.Query,
  },
  Mutation: {
    ...appointmentsResolvers.Mutation,
    ...doctorsResolvers.Mutation,
    ...ownersResolvers.Mutation,
    ...petsResolvers.Mutation,
  },
  // Type resolvers
  Doctor: doctorsResolvers.Doctor,
  Specialization: doctorsResolvers.Specialization,
  Owner: ownersResolvers.Owner,
  Pet: petsResolvers.Pet,
  Appointment: appointmentsResolvers.Appointment,
};
