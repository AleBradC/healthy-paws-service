import { appointmentsService } from "./appointments.service";
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
    appointment: async (_: any, { id }: GetByIdArgs, context: GraphQLContext) => {
      return appointmentsService.getAppointment(id, context.user!.id, context.user!.role);
    },
  },

  Mutation: {
    createAppointment: async (_: any, { input }: CreateAppointmentArgs, context: GraphQLContext) => {
      return appointmentsService.createAppointment(input, context.user!.id);
    },
    updateAppointment: async (_: any, { input }: UpdateAppointmentArgs, context: GraphQLContext) => {
      return appointmentsService.updateAppointment(input, context.user!.id, context.user!.role);
    },
    removeAppointment: async (_: any, { input }: RemoveAppointmentArgs, context: GraphQLContext) => {
      return appointmentsService.removeAppointment(input, context.user!.id, context.user!.role);
    },
  },

  Appointment: {
    doctor: (appointment: Appointment, _args: any, context: GraphQLContext) =>
      context.doctorLoaders.doctorById.load(appointment.doctor_id),
    patient: (appointment: Appointment, _args: any, context: GraphQLContext) =>
      context.petLoaders.petById.load(appointment.pet_id),
    status: (appointment: Appointment) => appointmentsService.getAppointmentStatus(appointment),
  },
};
