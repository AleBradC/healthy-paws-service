import {
  getAllDoctors,
  updateDoctorProfile,
  addDoctorSpecialization,
  removeDoctorSpecialization,
  updateDoctorSpecialization,
  addDoctorAvailability,
  removeDoctorAvailability,
  getDoctorsTotalCount,
  getAllSpecializations,
} from "./doctors.repository";
import { verifyDoctorOwnership } from "../../core/utils/authorization.utils";
import {
  UpdateDoctorProfileInput,
  AddDoctorSpecializationInput,
  RemoveDoctorSpecializationInput,
  UpdateDoctorSpecializationInput,
  AddDoctorAvailabilityInput,
  RemoveDoctorAvailabilityInput,
} from "../../schema/resolvers.types";

export const doctorsService = {
  getDoctors: async (limit: number, skip: number, name?: string, specializationId?: string) => {
    const items = await getAllDoctors(limit, skip, name, specializationId);
    const totalCount = await getDoctorsTotalCount(name, specializationId);
    return { items, totalCount };
  },

  getAllSpecializations: () => {
    return getAllSpecializations();
  },

  updateDoctorProfile: async (input: UpdateDoctorProfileInput, userId: string) => {
    await verifyDoctorOwnership(userId, input.doctorId);
    return updateDoctorProfile(input);
  },

  addDoctorSpecialization: async (input: AddDoctorSpecializationInput, userId: string) => {
    await verifyDoctorOwnership(userId, input.doctorId);
    return addDoctorSpecialization(input);
  },

  removeDoctorSpecialization: async (input: RemoveDoctorSpecializationInput, userId: string) => {
    await verifyDoctorOwnership(userId, input.doctorId);
    return removeDoctorSpecialization(input);
  },

  updateDoctorSpecialization: async (input: UpdateDoctorSpecializationInput, userId: string) => {
    await verifyDoctorOwnership(userId, input.doctorId);
    return updateDoctorSpecialization(input);
  },

  addDoctorAvailability: async (input: AddDoctorAvailabilityInput, userId: string) => {
    await verifyDoctorOwnership(userId, input.doctorId);
    return addDoctorAvailability(input);
  },

  removeDoctorAvailability: async (input: RemoveDoctorAvailabilityInput, userId: string) => {
    await verifyDoctorOwnership(userId, input.doctorId);
    return removeDoctorAvailability(input);
  },
};
