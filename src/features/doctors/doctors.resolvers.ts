import {
  getAllDoctors,
  updateDoctorProfile,
  addDoctorSpecialization,
  removeDoctorSpecialization,
  updateDoctorSpecialization,
  addDoctorAvailability,
  removeDoctorAvailability,
  getAppointmentsByDoctor,
  getAvailabilitiesByDoctor,
  getEmailDoctor,
  getPatientsByDoctor,
  getDoctorsTotalCount,
} from "./doctors.repository";
import { GraphQLContext } from "../../schema/loaders";
import { Doctor, Specialization } from "../../types";
import {
  GetByIdArgs,
  UpdateDoctorProfileArgs,
  AddDoctorSpecializationArgs,
  RemoveDoctorSpecializationArgs,
  UpdateDoctorSpecializationArgs,
  AddDoctorAvailabilityArgs,
  RemoveDoctorAvailabilityArgs,
  GetPaginationArgs,
} from "../../schema/resolvers.types";

export const doctorsResolvers = {
  Query: {
    doctors: async (_: any, { limit, skip }: GetPaginationArgs) => {
      const items = await getAllDoctors(limit, skip);
      const totalCount = await getDoctorsTotalCount();
      return { items, totalCount };
    },
    doctor: (_: any, { id }: GetByIdArgs, context: GraphQLContext) =>
      context.doctorLoaders.doctorById.load(id),
  },

  Mutation: {
    updateDoctorProfile: (_: any, { input }: UpdateDoctorProfileArgs) =>
      updateDoctorProfile(input),
    addDoctorSpecialization: (_: any, { input }: AddDoctorSpecializationArgs) =>
      addDoctorSpecialization(input),
    removeDoctorSpecialization: (
      _: any,
      { input }: RemoveDoctorSpecializationArgs
    ) => removeDoctorSpecialization(input),
    updateDoctorSpecialization: (
      _: any,
      { input }: UpdateDoctorSpecializationArgs
    ) => updateDoctorSpecialization(input),
    addDoctorAvailability: (_: any, { input }: AddDoctorAvailabilityArgs) =>
      addDoctorAvailability(input),
    removeDoctorAvailability: (
      _: any,
      { input }: RemoveDoctorAvailabilityArgs
    ) => removeDoctorAvailability(input),
  },

  Doctor: {
    email: (doctor: Doctor) => getEmailDoctor(doctor.user_id),
    specializations: async (
      doctor: Doctor,
      _: any,
      context: GraphQLContext
    ) => {
      const specs = await context.doctorLoaders.specializationsByDoctor.load(
        doctor.id
      );
      return specs.map((spec: any) => ({ ...spec, doctorId: doctor.id }));
    },
    availabilities: (doctor: Doctor) => getAvailabilitiesByDoctor(doctor.id),
    appointments: (doctor: Doctor) => getAppointmentsByDoctor(doctor.id),
    patients: (doctor: Doctor) => getPatientsByDoctor(doctor.id),
  },

  Specialization: {
    services: (
      specialization: Specialization & { doctorId: string },
      _args: any,
      context: GraphQLContext
    ) =>
      context.doctorLoaders.servicesByDoctorAndSpecialization.load({
        doctorId: specialization.doctorId,
        specializationId: specialization.id,
      }),
  },
};
