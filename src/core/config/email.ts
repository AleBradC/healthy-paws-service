export const APP_NAME = process.env.APP_NAME ?? "Healthy Paws Clinic";
export const PASSWORD_RESET_EXPIRES_MINUTES = Number(
  process.env.PASSWORD_RESET_EXPIRES_MINUTES ?? 15
);
// 24h is the industry-standard verification window. Long enough that an email
// reaching a spam folder + manual rescue still works; short enough that an
// abandoned signup can be re-attempted with the same email a day later.
export const EMAIL_VERIFICATION_EXPIRES_HOURS = Number(
  process.env.EMAIL_VERIFICATION_EXPIRES_HOURS ?? 24
);
