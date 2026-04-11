import {
  getAppointmentById,
  createAppointment,
  updateAppointment,
  removeAppointment,
} from "../graphql-db/appointments";
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
} from "../graphql-db/doctors";
import {
  getAllOwners,
  getOwnerEmail,
  getPetsByOwner,
  updateOwnerProfile,
} from "../graphql-db/owners";
import { createPet, updatePet } from "../graphql-db/pets";
import { GraphQLContext } from "../loaders/types";
import { Doctor, Specialization, Owner, Pet, Appointment } from "../types";
import {
  GetByIdArgs,
  CreatePetArgs,
  UpdatePetArgs,
  CreateAppointmentArgs,
  UpdateAppointmentArgs,
  RemoveAppointmentArgs,
  UpdateDoctorProfileArgs,
  AddDoctorSpecializationArgs,
  RemoveDoctorSpecializationArgs,
  UpdateDoctorSpecializationArgs,
  AddDoctorAvailabilityArgs,
  RemoveDoctorAvailabilityArgs,
  UpdateOwnerProfileArgs,
  GetPaginationArgs,
} from "./types";

export const resolvers = {
  Query: {
    doctors: async (_: any, { limit, skip }: GetPaginationArgs) => {
      const items = await getAllDoctors(limit, skip);
      const totalCount = await getDoctorsTotalCount();

      return {
        items,
        totalCount,
      };
    },
    doctor: (_: any, { id }: GetByIdArgs, context: GraphQLContext) =>
      context.doctorLoaders.doctorById.load(id),
    owners: () => getAllOwners(),
    owner: (_: any, { id }: GetByIdArgs, context: GraphQLContext) =>
      context.ownerLoaders.ownerById.load(id),
    pet: (_: any, { id }: GetByIdArgs, context: GraphQLContext) =>
      context.petLoaders.petById.load(id),
    appointment: (_: any, { id }: GetByIdArgs) => getAppointmentById(id),
  },

  Mutation: {
    createPet: (_: any, { input }: CreatePetArgs) => createPet(input),
    updatePet: (_: any, { input }: UpdatePetArgs) => updatePet(input),
    createAppointment: (_: any, { input }: CreateAppointmentArgs) =>
      createAppointment(input),
    updateAppointment: (_: any, { input }: UpdateAppointmentArgs) =>
      updateAppointment(input),
    removeAppointment: (_: any, { input }: RemoveAppointmentArgs) =>
      removeAppointment(input),
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
    updateOwnerProfile: (_: any, { input }: UpdateOwnerProfileArgs) =>
      updateOwnerProfile(input),
  },

  // --- Type Resolvers ---
  // Nested fields
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

  Owner: {
    email: (owner: Owner) => getOwnerEmail(owner.user_id),
    pets: (owner: Owner) => getPetsByOwner(owner.id),
  },

  Pet: {
    owner: (pet: Pet, _args: any, context: GraphQLContext) =>
      context.petLoaders.ownerByPetId.load(pet.id),
    appointments: (pet: Pet, _: any, context: GraphQLContext) =>
      context.petLoaders.appointmentsByPetId.load(pet.id),
    lifelong_conditions: (pet: Pet, _args: any, context: GraphQLContext) =>
      context.petLoaders.lifelongConditionsByPetId.load(pet.id),
    active_treatments: (pet: Pet, _args: any, context: GraphQLContext) =>
      context.petLoaders.activeTreatmentsByPetId.load(pet.id),
  },

  Appointment: {
    doctor: (appointment: Appointment, _args: any, context: GraphQLContext) =>
      context.doctorLoaders.doctorById.load(appointment.doctor_id),
    patient: (appointment: Appointment, _args: any, context: GraphQLContext) =>
      context.petLoaders.petById.load(appointment.pet_id),
  },
};
