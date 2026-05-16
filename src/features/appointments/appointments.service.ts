import {
  getAppointmentById,
  createAppointment,
  updateAppointment,
  removeAppointment,
  verifyAppointmentOwnership,
} from "./appointments.repository";
import { verifyPetOwnership } from "../pets/pets.repository";
import { Appointment } from "../../types";
import { CreateAppointmentInput, UpdateAppointmentInput, RemoveAppointmentInput } from "../../schema/resolvers.types";

export const appointmentsService = {
  getAppointment: async (id: string, userId: string, userRole: string) => {
    await verifyAppointmentOwnership(userId, userRole, id);
    return getAppointmentById(id);
  },

  createAppointment: async (input: CreateAppointmentInput, userId: string) => {
    await verifyPetOwnership(userId, input.petId);
    return createAppointment(input);
  },

  updateAppointment: async (input: UpdateAppointmentInput, userId: string, userRole: string) => {
    await verifyAppointmentOwnership(userId, userRole, input.appointmentId);
    return updateAppointment(input);
  },

  removeAppointment: async (input: RemoveAppointmentInput, userId: string, userRole: string) => {
    await verifyAppointmentOwnership(userId, userRole, input.appointmentId);
    return removeAppointment(input);
  },

  getAppointmentStatus: (appointment: Appointment) => {
    if (appointment.status !== "Confirmed") return appointment.status;

    const apptTime = new Date(appointment.datetime).getTime();
    const now = new Date().getTime();
    const diffInHours = (apptTime - now) / (1000 * 60 * 60);

    if (diffInHours > 0 && diffInHours <= 2) {
      return "Upcoming";
    }

    return appointment.status;
  },
};
