export const APP_NAME = process.env.APP_NAME ?? "Healthy Paws Clinic";
export const PASSWORD_RESET_EXPIRES_MINUTES = Number(
  process.env.PASSWORD_RESET_EXPIRES_MINUTES ?? 15,
);

export const EMAIL_VERIFICATION_EXPIRES_HOURS = Number(
  process.env.EMAIL_VERIFICATION_EXPIRES_HOURS ?? 24,
);
