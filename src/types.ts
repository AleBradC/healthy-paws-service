import { ROLES } from "./constants";

// TODO

// --- PAYLOAD TYPES  ---
export interface OwnerPayload {
  name: string;
  email: string;
  password?: string; // Optional for security
  confirmPassword?: string;
}

export interface PetPayload {
  name: string;
  type: string;
  breed: string;
  age: number;
  weight: number;
}

export interface RegisterOwnerPayload {
  owner: OwnerPayload;
  pet: PetPayload;
}

export interface DoctorServicePayload {
  id: string; // The service ID from the DB
  name: string;
  price: number;
}

export interface DoctorSpecializationPayload {
  id: string; // The specialization ID from the DB
  name: string;
  services: DoctorServicePayload[];
}

export interface DoctorPayload {
  name: string;
  email: string;
  password?: string; // Optional for security
  confirmPassword?: string;
  clinicName: string;
  clinicAddress: string;
  specializations: DoctorSpecializationPayload[];
}

export interface RegisterDoctorPayload {
  doctor: DoctorPayload;
}

// --- API PAYLOAD ---
export interface UnifiedRegisterPayload {
  role: ROLES;
  owner?: OwnerPayload;
  pet?: PetPayload;
  doctor?: DoctorPayload;
}

// --- DATABASE RECORD TYPES ---
export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  password_salt: string;
  role: ROLES;
}

// --- REPOSITORY METHOD ARGUMENT TYPES ---
export interface CreateOwnerArgs {
  email: string;
  hash: string;
  salt: string;
  role: ROLES.OWNER_ROLE;
  ownerName: string;
  petData: PetPayload;
}

export interface CreateDoctorArgs {
  email: string;
  hash: string;
  salt: string;
  role: ROLES.DOCTOR_ROLE;
  doctorData: DoctorPayload; // This is the key change
}

// --- AUTH TYPES ---
export interface User {
  id: string;
  email: string;
  role: ROLES;
}

export interface JwtPayload {
  id: string;
  email: string;
  role: ROLES;
  iat?: number;
  exp?: number;
}
