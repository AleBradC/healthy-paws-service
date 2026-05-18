import { z } from "zod";

// The token is base64url, 32-byte entropy → 43 chars. We don't enforce the
// length strictly here (use min(20) as a sanity floor) so we have headroom
// to change generation later without coordinating a schema change.
export const verifyEmailSchema = z.object({
  token: z.string().min(20, "Verification token is required."),
});

export const resendVerificationSchema = z.object({
  email: z.email("Please enter a valid email address."),
});

export type VerifyEmailBody = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationBody = z.infer<typeof resendVerificationSchema>;
