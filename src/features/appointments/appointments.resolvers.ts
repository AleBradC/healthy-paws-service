import {
  getAppointmentById,
  createAppointment,
  updateAppointment,
  removeAppointment,
} from "./appointments.repository";
import { GraphQLContext } from "../../schema/loaders";
import { Appointment } from "../../types";
import {
  GetByIdArgs,
  CreateAppointmentArgs,
  UpdateAppointmentArgs,
  RemoveAppointmentArgs,
} from "../../schema/resolvers.types";

export const appointmentsResolvers = {
  Query: {
    appointment: (_: any, { id }: GetByIdArgs) => getAppointmentById(id),
  },

  Mutation: {
    createAppointment: (_: any, { input }: CreateAppointmentArgs) =>
      createAppointment(input),
    updateAppointment: (_: any, { input }: UpdateAppointmentArgs) =>
      updateAppointment(input),
    removeAppointment: (_: any, { input }: RemoveAppointmentArgs) =>
      removeAppointment(input),
  },

  Appointment: {
    doctor: (appointment: Appointment, _args: any, context: GraphQLContext) =>
      context.doctorLoaders.doctorById.load(appointment.doctor_id),
    patient: (appointment: Appointment, _args: any, context: GraphQLContext) =>
      context.petLoaders.petById.load(appointment.pet_id),
  },
};
