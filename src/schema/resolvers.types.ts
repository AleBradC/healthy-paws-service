// ==================================================================
// Generic & Query Args
// ==================================================================
export interface GetByIdArgs {
  id: string;
}

export interface GetPaginationArgs {
  limit: number;
  skip: number;
  name?: string;
}

// ==================================================================
// Mutation Args
// ==================================================================

// --- Appointment ---
export interface CreateAppointmentInput {
  petId: string;
  doctorId: string;
  appointmentDatetime: string;
  status: "Pending" | "Confirmed" | "Declined" | "Upcoming" | "Begin" | "Completed" | "Cancel";
  consultationType: string;
}
export interface CreateAppointmentArgs {
  input: CreateAppointmentInput;
}

export interface UpdateAppointmentInput {
  appointmentId: string;
  status?: "Pending" | "Confirmed" | "Declined" | "Upcoming" | "Begin" | "Completed" | "Cancel" | string;
  reason?: string;
  consultationType?: string;
  investigation?: string;
  investigationResult?: string;
  patientDetails?: AppointmentPetDetailsInput;
  lifelongConditions?: LifelongConditionInput[];
  activeTreatments?: ActiveTreatmentInput[];
}
export interface UpdateAppointmentArgs {
  input: UpdateAppointmentInput;
}

export interface RemoveAppointmentInput {
  appointmentId: string;
}
export interface RemoveAppointmentArgs {
  input: RemoveAppointmentInput;
}

// --- Nested Inputs for UpdateAppointment ---
export interface AppointmentPetDetailsInput {
  name?: string;
  type?: string;
  breed?: string;
  age?: number;
  weight?: number;
}

export interface LifelongConditionInput {
  id?: string;
  condition: string;
  treatment: string;
}

export interface ActiveTreatmentInput {
  id?: string;
  condition: string;
  treatment: string;
  start_date: string;
  end_date?: string;
}

// --- Pet ---
export interface CreatePetInput {
  ownerId: string;
  name: string;
  type: string;
  breed: string;
  age: number;
  weight: number;
}
export interface CreatePetArgs {
  input: CreatePetInput;
}

export interface UpdatePetInput {
  petId: string;
  name?: string;
  type?: string;
  breed?: string;
  age?: number;
  weight?: number;
}
export interface UpdatePetArgs {
  input: UpdatePetInput;
}

// --- Doctor ---
export interface UpdateDoctorProfileInput {
  doctorId: string;
  name?: string;
  clinicName?: string;
  clinicAddress?: string;
}
export interface UpdateDoctorProfileArgs {
  input: UpdateDoctorProfileInput;
}

export interface AddDoctorSpecializationInput {
  doctorId: string;
  specializationName: string;
  services: ServiceInput[];
}
export interface AddDoctorSpecializationArgs {
  input: AddDoctorSpecializationInput;
}

export interface RemoveDoctorSpecializationInput {
  doctorId: string;
  specializationId: string;
}
export interface RemoveDoctorSpecializationArgs {
  input: RemoveDoctorSpecializationInput;
}

export interface UpdateDoctorSpecializationInput {
  doctorId: string;
  specializationId: string;
  services: ServiceUpdateInput[];
}
export interface UpdateDoctorSpecializationArgs {
  input: UpdateDoctorSpecializationInput;
}

export interface ServiceInput {
  name: string;
  price: number;
}
export interface ServiceUpdateInput {
  id?: string;
  name: string;
  price: number;
}

export interface AddDoctorAvailabilityInput {
  doctorId: string;
  availabilities: string[];
}
export interface AddDoctorAvailabilityArgs {
  input: AddDoctorAvailabilityInput;
}

export interface RemoveDoctorAvailabilityInput {
  doctorId: string;
  availabilityId: string;
}
export interface RemoveDoctorAvailabilityArgs {
  input: RemoveDoctorAvailabilityInput;
}

// --- Owner ---
export interface UpdateOwnerProfileInput {
  ownerId: string;
  name: string;
}
export interface UpdateOwnerProfileArgs {
  input: UpdateOwnerProfileInput;
}
