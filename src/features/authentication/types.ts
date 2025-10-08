export interface UserRecord {
  id: string;
  name: string;
  email: string;
  hash: string;
  salt: string;
  pet_name: string;
  pet_type: string;
  pet_breed: string;
  pet_age: number;
  pet_weight: number;
}
