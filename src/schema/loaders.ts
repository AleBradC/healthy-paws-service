import { Pool } from "pg";
import DataLoader from "dataloader";
import {
  Doctor,
  Specialization,
  Service,
  Pet,
  Owner,
  Appointment,
  LifelongCondition,
  ActiveTreatment,
} from "../core/utils/types";
import { JwtPayload } from "jsonwebtoken";

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
  user?: JwtPayload | null;
  doctorLoaders: DoctorLoaders;
  petLoaders: PetLoaders;
  ownerLoaders: OwnerLoaders;
  // Optional because not every test harness sets it; production always has it.
  audit?: {
    ip: string | null;
    userAgent: string | null;
  };
}
