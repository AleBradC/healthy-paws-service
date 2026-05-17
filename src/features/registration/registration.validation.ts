import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+[\]{};':"\\|,.<>/?]).{8,}$/,
    "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
  );

export const ownerSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("A valid email address is required"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const petSchema = z.object({
  name: z.string().min(1, "Pet name is required"),
  type: z.string().min(1, "Pet type is required"),
  breed: z.string().min(1, "Breed is required"),
  age: z.number().int().positive("Age must be a positive integer"),
  weight: z.number().positive("Weight must be a positive number"),
});

export const doctorSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("A valid email address is required"),
    password: passwordSchema,
    confirmPassword: z.string(),
    clinicName: z.string().min(1, "Clinic name is required"),
    clinicAddress: z.string().min(1, "Clinic address is required"),
    specializations: z.array(
      z.object({
        name: z.string().min(1, "Specialization name is required"),
        services: z.array(
          z.object({
            name: z.string().min(1, "Service name is required"),
            price: z.number().positive("Price must be a positive number"),
          })
        ),
      })
    ),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
