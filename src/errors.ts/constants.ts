export enum ClientErrorMessages {
  USER_NOT_FOUND = "User not found.",
  INVALID_CREDENTIALS = "Invalid email or password.",
  ACCOUNT_EXISTS = "An account with this email already exists.",
  OWNER_AND_ANIMAL_REQUIRED = "Owner and animal details are required.",
  DOCTOR_DETAILS_REQUIRED = "Doctor details are required.",
  INVALID_ROLE = "A valid role ('owner' or 'doctor') must be specified.",
  INVALID_RESET_CODE = "Invalid or expired reset code.",
  OWNER_PROFILE_NOT_FOUND = "Owner profile not found.",
  DOCTOR_PROFILE_NOT_FOUND = "Doctor profile not found.",
  EMAIL_REQUIRED = "Email is required.",
  NEW_PASSWORD_REQUIRED = "New password is required.",
  REGISTRATION_FAILED = "Registration failed. Please try again later.",
  INTERNAL_SERVER_ERROR = "An internal server error occurred. Please try again later.",
}

export enum SystemErrorMessages {
  JWT_SECRET_UNDEFINED = "CRITICAL: JWT_SECRET is not defined in environment variables.",
  DB_TRANSACTION_FAILED = "Database transaction failed and was rolled back.",
  DB_QUERY_FAILED = "Database query failed.",
  MAIL_PROVIDER_ERROR = "Failed to send email via the provider.",
}

export enum SuccessMessages {
  LOGIN_SUCCESS = "Logged in successfully.",
  RESET_CODE_SENT = "Reset code sent to your email.",
  RESET_CODE_VERIFIED = "Code verified successfully.",
  PASSWORD_RESET_SUCCESS = "Password reset successfully.",
  OWNER_REGISTERED = "Pet owner registered successfully.",
  DOCTOR_REGISTERED = "Doctor registered successfully.",
}
