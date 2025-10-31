export enum ROLES {
  DOCTOR_ROLE = "doctor",
  OWNER_ROLE = "owner",
}

export const passwordResetTokens: {
  [token: string]: { userId: string; expires: number };
} = {};
