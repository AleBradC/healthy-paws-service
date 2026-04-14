import { Pool } from "pg";
import DataLoader from "dataloader";
import {
  Specialization,
  Service,
  Doctor,
  Pet,
  Owner,
  ActiveTreatment,
  Appointment,
  LifelongCondition,
} from "../types";

export interface DoctorLoaders {
  doctorById: DataLoader<string, Doctor | null>;
  specializationsByDoctor: DataLoader<string, Specialization[]>;
  servicesByDoctorAndSpecialization: DataLoader<
    { doctorId: string; specializationId: string },
    Service[]
  >;
}

export interface PetLoaders {
  petById: DataLoader<string, Pet | null>;
  ownerByPetId: DataLoader<string, Owner | null>;
  appointmentsByPetId: DataLoader<string, Appointment[]>;
  lifelongConditionsByPetId: DataLoader<string, LifelongCondition[]>;
  activeTreatmentsByPetId: DataLoader<string, ActiveTreatment[]>;
}

export interface OwnerLoaders {
  ownerById: DataLoader<string, Owner | null>;
}

export interface GraphQLContext {
  db: Pool;
  doctorLoaders: DoctorLoaders;
  petLoaders: PetLoaders;
  ownerLoaders: OwnerLoaders;
}
