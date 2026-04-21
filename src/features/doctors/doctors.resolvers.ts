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
  getAllSpecializations,
} from "./doctors.repository";
import { GraphQLContext } from "../../schema/loaders";
import { Doctor, Specialization } from "../../types";
import { verifyDoctorOwnership } from "../../core/utils/authorization.utils";
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
    doctors: async (_: any, { limit, skip, name, specializationId }: GetPaginationArgs) => {
      const items = await getAllDoctors(limit, skip, name, specializationId);
      const totalCount = await getDoctorsTotalCount(name, specializationId);
      return { items, totalCount };
    },
    specializations: () => getAllSpecializations(),
    doctor: (_: any, { id }: GetByIdArgs, context: GraphQLContext) =>
      context.doctorLoaders.doctorById.load(id),
  },

  Mutation: {
    updateDoctorProfile: async (_: any, { input }: UpdateDoctorProfileArgs, context: GraphQLContext) => {
      await verifyDoctorOwnership(context.user!.id, input.doctorId);
      return updateDoctorProfile(input);
    },
    addDoctorSpecialization: async (_: any, { input }: AddDoctorSpecializationArgs, context: GraphQLContext) => {
      await verifyDoctorOwnership(context.user!.id, input.doctorId);
      return addDoctorSpecialization(input);
    },
    removeDoctorSpecialization: async (
      _: any,
      { input }: RemoveDoctorSpecializationArgs,
      context: GraphQLContext
    ) => {
      await verifyDoctorOwnership(context.user!.id, input.doctorId);
      return removeDoctorSpecialization(input);
    },
    updateDoctorSpecialization: async (
      _: any,
      { input }: UpdateDoctorSpecializationArgs,
      context: GraphQLContext
    ) => {
      await verifyDoctorOwnership(context.user!.id, input.doctorId);
      return updateDoctorSpecialization(input);
    },
    addDoctorAvailability: async (_: any, { input }: AddDoctorAvailabilityArgs, context: GraphQLContext) => {
      await verifyDoctorOwnership(context.user!.id, input.doctorId);
      return addDoctorAvailability(input);
    },
    removeDoctorAvailability: async (
      _: any,
      { input }: RemoveDoctorAvailabilityArgs,
      context: GraphQLContext
    ) => {
      await verifyDoctorOwnership(context.user!.id, input.doctorId);
      return removeDoctorAvailability(input);
    },
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
    services: async (
      specialization: Specialization & { doctorId: string },
      _args: any,
      context: GraphQLContext
    ) => {
      const services = await context.doctorLoaders.servicesByDoctorAndSpecialization.load(
        {
        doctorId: specialization.doctorId,
        specializationId: specialization.id,
        }
      );

      return services.map((service: any) => ({
        ...service,
        specialization_id: service.specialization_id ?? specialization.id,
      }));
    },
  },
};
