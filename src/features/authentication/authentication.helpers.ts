import { z } from "zod";

export const requestResetSchema = z.object({
    email: z.string().email(),
});

export const resetSchema = z.object({
    token: z.string().min(1),
    newPassword: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+[\]{};':"\\|,.<>/?]).{8,}$/,
            "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
        ),
});
