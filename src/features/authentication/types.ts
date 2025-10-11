// Register
// ------ Payload
export interface OwnerPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AnimalPayload {
  name: string;
  type: string;
  breed: string;
  age: number;
  weight: number;
}

export interface RegisterPayload {
  owner: OwnerPayload;
  animal: AnimalPayload;
}

// ------ DB
export interface OwnerRecord {
  id: string; // Typically a UUID
  name: string;
  email: string;
  hash: string;
  salt: string;
  createdAt?: Date;
}

export interface AnimalRecord {
  id: string; // Typically a UUID
  ownerId: string; // Foreign Key referencing the Owner's id
  name: string;
  type: string;
  breed: string;
  age: number;
  weight: number;
  createdAt?: Date;
}

export interface UserRecord {
  owner: OwnerRecord;
  animals: AnimalRecord;
}
