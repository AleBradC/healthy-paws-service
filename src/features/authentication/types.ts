// --- PAYLOAD TYPES (Data sent from Frontend to Backend) ---
export interface OwnerPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string; // Used for validation, not stored in DB
}
export interface AnimalPayload {
  name: string;
  type: string;
  breed: string;
  age: number;
  weight: number;
}
export interface RegisterOwnerPayload {
  owner: OwnerPayload;
  animal: AnimalPayload;
}
export interface DoctorPayload {
  name: string;
  email: string;
  password: string;
  specialty: string;
  clinic: string;
  address: string;
  services: {
    service: string;
    price: number;
  }[];
}
export interface RegisterDoctorPayload {
  doctor: DoctorPayload;
}

// API
export interface UnifiedRegisterPayload {
  role: "owner" | "doctor";
  owner?: OwnerPayload;
  animal?: AnimalPayload;
  doctor?: DoctorPayload;
}

// --- DATABASE RECORD TYPES (Represents data structure in your PostgreSQL database) ---

export interface UserRecord {
  id: string; // UUID
  email: string;
  hash: string;
  salt: string;
  role: "owner" | "doctor";
  created_at?: Date;
}

export interface OwnerRecord {
  id: string; // UUID
  user_id: string; // Foreign Key to 'users' table
  name: string;
  created_at?: Date;
}

export interface DoctorRecord {
  id: string; // UUID
  user_id: string; // Foreign Key to 'users' table
  name: string;
  specialization: string;
  clinic_name: string;
  clinic_address: string;
  image_url?: string;
  created_at?: Date;
}

export interface AnimalRecord {
  id: string; // UUID
  owner_id: string; // Foreign Key to 'owners' table
  name: string;
  type: string;
  breed: string;
  age: number;
  weight: number;
  created_at?: Date;
}
