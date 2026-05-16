import { Request, Response, NextFunction } from "express";
import { ROLES } from "./constants";

// Row from Users table (DB record, includes all fields).
// Only use this where password_hash is explicitly required (e.g. validateUser).
export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  password_salt: string;
  role: ROLES;
}

// Projection of Users row without credentials.
// Use as the return type of any lookup that does NOT need the password hash.
export interface SafeUserRecord {
  id: string;
  email: string;
  role: ROLES;
}

// --- DB Repository Method Argument Types ---
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
  doctorData: DoctorPayload;
}

/* ----------------------------------------------------------
   PAYLOAD / DTO TYPES
---------------------------------------------------------- */

export interface UserResponse {
  id: string;
  email: string;
  role: ROLES;
}

export interface JwtPayload {
  id:   string;
  email: string;
  role:  ROLES;
  iss?:  string;
  aud?:  string | string[];
  iat?:  number;
  exp?:  number;
}

// Registration owner payload (request DTO)
export interface OwnerPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}
export interface PetPayload {
  name: string;
  type: string;
  breed: string;
  age: number;
  weight: number;
}
export interface DoctorServicePayload {
  id: string;
  name: string;
  price: number;
}
export interface DoctorSpecializationPayload {
  id: string;
  name: string;
  services: DoctorServicePayload[];
}
export interface DoctorPayload {
  name: string;
  email: string;
  password?: string;
  confirmPassword?: string;
  clinicName: string;
  clinicAddress: string;
  specializations: DoctorSpecializationPayload[];
}
export interface UnifiedRegisterPayload {
  role: ROLES;
  owner?: OwnerPayload;
  pet?: PetPayload;
  doctor?: DoctorPayload;
}

/* ----------------------------------------------------------
   REGISTRATION TYPES
---------------------------------------------------------- */

// For registration service/controller (combines payloads for user creation)
export interface RegisterOwnerPayload {
  owner: OwnerPayload;
  pet: PetPayload;
}
export interface RegisterDoctorPayload {
  doctor: DoctorPayload;
}

/* ----------------------------------------------------------
   AUTHENTICATION TYPES
---------------------------------------------------------- */

// Method Parameters (Passed into Auth/Registration services etc)
export interface ValidateUserParams {
  email: string;
  password: string;
}
export interface ResetPasswordParams {
  userId: string;
  newPassword: string;
}
export interface FindUserByIdParams {
  id: string;
}
export interface FindUserByEmailParams {
  email: string;
}
export interface FindOwnerIdByUserIdParams {
  userId: string;
}
export interface FindDoctorIdByUserIdParams {
  userId: string;
}
export interface UpdateUserPasswordParams {
  userId: string;
  hash: string;
  salt: string;
}

/* ----------------------------------------------------------
   CONTROLLER PARAMETER TYPES
---------------------------------------------------------- */

export interface LoginControllerParams {
  req: Request;
  res: Response;
  next: NextFunction;
}
export interface ResetPasswordControllerParams {
  req: Request;
  res: Response;
}

/* ----------------------------------------------------------
   METHOD RETURN TYPES
---------------------------------------------------------- */

export interface AuthResult {
  user: UserResponse | null;
  message?: string;
}
export interface ResetPasswordResult {
  message: string;
}
export interface FindUserResult {
  user: UserRecord | null;
}
export interface OwnerDoctorIdResult {
  id: string | null;
}
export interface UpdatePasswordResult {
  success: boolean;
}
export interface RegisterUserResult {
  id: string;
  email: string;
}

/* ----------------------------------------------------------
   MISCELLANEOUS STRUCTURES
---------------------------------------------------------- */

export interface PasswordResetTokenData {
  userId: string;
  expires: number;
}
export type PasswordResetTokens = {
  [token: string]: PasswordResetTokenData;
};

// --- GRAPHQL ENTITY TYPES ---

export interface User {
  id: string;
  email: string;
  hash?: string;
  salt?: string;
  role: "owner" | "doctor";
}

export interface Owner {
  id: string;
  name: string;
  email?: string;
  pets?: Pet[];
  appointments?: Appointment[];
}

export interface Doctor {
  id: string;
  name: string;
  email?: string;
  clinic_name?: string;
  clinic_address?: string;
  specializations?: Specialization[];
  availabilities?: Availability[];
  appointments?: Appointment[];
  patients?: Pet[];
}

export interface Pet {
  id: string;
  name: string;
  owner?: Owner;
  type?: string;
  breed?: string;
  age?: number;
  weight?: number;
  lifelong_conditions?: LifelongCondition[];
  active_treatments?: ActiveTreatment[];
  appointments?: Appointment[];
}

export interface Appointment {
  id: string;
  doctor_id: string;
  pet_id: string;
  datetime: string;
  patient?: Pet;
  doctor?: Doctor;
  status?: "Pending" | "Confirmed" | "Declined" | "Upcoming" | "Begin" | "Completed" | "Cancel" | string;
  reason?: string;
  consultation_type?: string;
  investigation?: string;
  investigation_result?: string;
}

export interface Specialization {
  id: string;
  name: string;
  services?: Service[];
}

export interface Service {
  id: string;
  specialization_id: string;
  name: string;
  price: number;
}

export interface Availability {
  id: string;
  available_datetime: string;
}

export interface LifelongCondition {
  id: string;
  condition: string;
  treatment: string;
}

export interface ActiveTreatment {
  id: string;
  condition: string;
  treatment: string;
  start_date: string;
  end_date?: string;
}

// --- STANDARDIZED API RESPONSE ---
export interface ApiResponse<T = any> {
  status: "success" | "error";
  message?: string;
  data?: T;
}
