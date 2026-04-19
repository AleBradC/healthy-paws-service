import {
  getAppointmentById,
  createAppointment,
  updateAppointment,
  removeAppointment,
} from "./appointments.repository";
import { GraphQLContext } from "../../schema/loaders";
import { Appointment } from "../../types";
import { verifyAppointmentOwnership, verifyPetOwnership } from "../../core/utils/authorization.utils";
import {
  GetByIdArgs,
  CreateAppointmentArgs,
  UpdateAppointmentArgs,
  RemoveAppointmentArgs,
} from "../../schema/resolvers.types";

export const appointmentsResolvers = {
  Query: {
    appointment: async (_: any, { id }: GetByIdArgs, context: GraphQLContext) => {
      await verifyAppointmentOwnership(
        context.user!.id,
        context.user!.role,
        id
      );
      return getAppointmentById(id);
    },
  },

  Mutation: {
    createAppointment: async (_: any, { input }: CreateAppointmentArgs, context: GraphQLContext) => {
      await verifyPetOwnership(context.user!.id, input.petId);
      return createAppointment(input);
    },
    updateAppointment: async (_: any, { input }: UpdateAppointmentArgs, context: GraphQLContext) => {
      await verifyAppointmentOwnership(context.user!.id, context.user!.role, input.appointmentId);
      return updateAppointment(input);
    },
    removeAppointment: async (_: any, { input }: RemoveAppointmentArgs, context: GraphQLContext) => {
      await verifyAppointmentOwnership(context.user!.id, context.user!.role, input.appointmentId);
      return removeAppointment(input);
    },
  },

  Appointment: {
    doctor: (appointment: Appointment, _args: any, context: GraphQLContext) =>
      context.doctorLoaders.doctorById.load(appointment.doctor_id),
    patient: (appointment: Appointment, _args: any, context: GraphQLContext) =>
      context.petLoaders.petById.load(appointment.pet_id),
    status: (appointment: Appointment) => {
      if (appointment.status !== "Confirmed") return appointment.status;

      const apptTime = new Date(appointment.datetime).getTime();
      const now = new Date().getTime();
      const diffInHours = (apptTime - now) / (1000 * 60 * 60);

      if (diffInHours > 0 && diffInHours <= 2) {
        return "Upcoming";
      }

      return appointment.status;
    },
  },
};
