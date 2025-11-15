export enum ROLES {
  DOCTOR_ROLE = "doctor",
  OWNER_ROLE = "owner",
}

export const passwordResetTokens: {
  [token: string]: { userId: string; expires: number };
} = {};

export enum ErrorMessages {
  JWT_SECRET_UNDEFINED = "JWT_SECRET is not defined in environment variables.",
  USER_NOT_FOUND = "User not found.",
  INVALID_CREDENTIALS = "Invalid email or password.",
  OWNER_AND_ANIMAL_REQUIRED = "Owner and animal details are required.",
  DOCTOR_DETAILS_REQUIRED = "Doctor details are required.",
  INVALID_ROLE = "A valid role ('owner' or 'doctor') must be specified.",
  ACCOUNT_EXISTS = "An account with this email already exists.",
  INTERNAL_SERVER_ERROR = "An internal server error occurred.",
  REGISTRATION_FAILED = "Failed to create doctor. Transaction was rolled back.",
}
