import { doctorsService } from "./doctors.service";
import {
  getAppointmentsByDoctor,
  getAvailabilitiesByDoctor,
  getEmailDoctor,
  getPatientsByDoctor,
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
    doctors: async (_: any, { limit, skip, name, specializationId }: GetPaginationArgs) => {
      return doctorsService.getDoctors(limit, skip, name, specializationId);
    },
    specializations: () => doctorsService.getAllSpecializations(),
    doctor: (_: any, { id }: GetByIdArgs, context: GraphQLContext) =>
      context.doctorLoaders.doctorById.load(id),
  },

  Mutation: {
    updateDoctorProfile: async (_: any, { input }: UpdateDoctorProfileArgs, context: GraphQLContext) => {
      return doctorsService.updateDoctorProfile(input, context.user!.id);
    },
    addDoctorSpecialization: async (_: any, { input }: AddDoctorSpecializationArgs, context: GraphQLContext) => {
      return doctorsService.addDoctorSpecialization(input, context.user!.id);
    },
    removeDoctorSpecialization: async (
      _: any,
      { input }: RemoveDoctorSpecializationArgs,
      context: GraphQLContext
    ) => {
      return doctorsService.removeDoctorSpecialization(input, context.user!.id);
    },
    updateDoctorSpecialization: async (
      _: any,
      { input }: UpdateDoctorSpecializationArgs,
      context: GraphQLContext
    ) => {
      return doctorsService.updateDoctorSpecialization(input, context.user!.id);
    },
    addDoctorAvailability: async (_: any, { input }: AddDoctorAvailabilityArgs, context: GraphQLContext) => {
      return doctorsService.addDoctorAvailability(input, context.user!.id);
    },
    removeDoctorAvailability: async (
      _: any,
      { input }: RemoveDoctorAvailabilityArgs,
      context: GraphQLContext
    ) => {
      return doctorsService.removeDoctorAvailability(input, context.user!.id);
    },
  },

  Doctor: {
    email: (doctor: Doctor) => getEmailDoctor(doctor.id),
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
