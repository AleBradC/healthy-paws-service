import { z } from "zod";
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";

// Must run before any zod schemas are introspected — patches the prototype
// so existing schemas defined elsewhere become OpenAPI-compatible without
// needing to be rewritten.
extendZodWithOpenApi(z);

import {
  ownerSchema,
  petSchema,
  doctorSchema,
} from "../features/registration/registration.validation";
import {
  requestResetSchema,
  resetSchema,
} from "../features/authentication/authentication.helpers";
import {
  verifyEmailSchema,
  resendVerificationSchema,
} from "../features/email-verification/email-verification.helpers";

const loginRequestSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .openapi("LoginRequest");

const userResponseSchema = z
  .object({
    id: z.string().openapi({ example: "9c5b1f0a-..." }),
    role: z.enum(["owner", "doctor"]),
  })
  .openapi("UserResponse");

const apiErrorSchema = z
  .object({
    status: z.literal("error"),
    message: z.string(),
  })
  .openapi("ApiError");

const successMessageSchema = z
  .object({
    status: z.literal("success"),
    message: z.string(),
  })
  .openapi("SuccessMessage");

const sessionResponseSchema = z
  .object({
    status: z.literal("success"),
    data: userResponseSchema.nullable(),
  })
  .openapi("SessionResponse");

const loginResponseSchema = z
  .object({
    status: z.literal("success"),
    data: userResponseSchema,
  })
  .openapi("LoginResponse");

const registerOwnerRequestSchema = z
  .object({
    owner: ownerSchema,
    pet: petSchema,
  })
  .openapi("RegisterOwnerRequest");

const registerDoctorRequestSchema = z
  .object({
    doctor: doctorSchema,
  })
  .openapi("RegisterDoctorRequest");

const registry = new OpenAPIRegistry();

// ---- Auth ----------------------------------------------------------------

registry.registerPath({
  method: "post",
  path: "/api/auth/login",
  tags: ["Authentication"],
  summary: "Log in with email and password",
  request: {
    body: {
      content: {
        "application/json": { schema: loginRequestSchema },
      },
    },
  },
  responses: {
    200: {
      description: "Login succeeded. JWT is set as an httpOnly cookie.",
      content: { "application/json": { schema: loginResponseSchema } },
      headers: {
        "Set-Cookie": {
          description:
            "accessToken=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/",
          schema: { type: "string" },
        },
      },
    },
    401: {
      description: "Invalid credentials",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    403: {
      description: "Email not verified — call /api/auth/resend-verification",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    429: {
      description: "Rate limit exceeded",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/logout",
  tags: ["Authentication"],
  summary: "Clear the session cookie",
  responses: {
    200: {
      description: "Cookie cleared",
      content: { "application/json": { schema: successMessageSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/auth/session",
  tags: ["Authentication"],
  summary: "Return the current session (or null when logged out)",
  responses: {
    200: {
      description:
        "Always 200. `data` is the user when there's a valid session, null otherwise.",
      content: { "application/json": { schema: sessionResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/reset-password/request",
  tags: ["Authentication"],
  summary: "Request a password-reset email",
  description:
    "Always returns 200 regardless of whether the email exists, to prevent account enumeration.",
  request: {
    body: {
      content: { "application/json": { schema: requestResetSchema } },
    },
  },
  responses: {
    200: {
      description: "Request accepted",
      content: { "application/json": { schema: successMessageSchema } },
    },
    429: {
      description: "Rate limit exceeded",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/reset-password/reset",
  tags: ["Authentication"],
  summary: "Consume a reset token and set a new password",
  request: {
    body: {
      content: { "application/json": { schema: resetSchema } },
    },
  },
  responses: {
    200: {
      description: "Password updated",
      content: { "application/json": { schema: successMessageSchema } },
    },
    400: {
      description: "Token invalid or expired, or password does not meet policy",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/verify-email",
  tags: ["Authentication"],
  summary: "Confirm an email address using the token from the verification mail",
  request: {
    body: {
      content: { "application/json": { schema: verifyEmailSchema } },
    },
  },
  responses: {
    200: {
      description: "Email verified",
      content: { "application/json": { schema: successMessageSchema } },
    },
    400: {
      description: "Token invalid, expired, or already used",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    429: {
      description: "Rate limit exceeded",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/resend-verification",
  tags: ["Authentication"],
  summary: "Re-send the verification email for an unverified account",
  description:
    "Always returns 200 with the same body regardless of whether the email is registered or already verified, to prevent account-state enumeration.",
  request: {
    body: {
      content: { "application/json": { schema: resendVerificationSchema } },
    },
  },
  responses: {
    200: {
      description: "Request accepted",
      content: { "application/json": { schema: successMessageSchema } },
    },
    429: {
      description: "Rate limit exceeded",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

// ---- Registration --------------------------------------------------------

registry.registerPath({
  method: "post",
  path: "/api/auth/register/owner",
  tags: ["Registration"],
  summary: "Create an owner account with a first pet",
  request: {
    body: {
      content: {
        "application/json": { schema: registerOwnerRequestSchema },
      },
    },
  },
  responses: {
    201: {
      description: "Account created",
      content: { "application/json": { schema: successMessageSchema } },
    },
    400: {
      description: "Validation failed",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    409: {
      description: "Email already in use",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    429: {
      description: "Rate limit exceeded",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/register/doctor",
  tags: ["Registration"],
  summary: "Create a doctor account with specializations and services",
  request: {
    body: {
      content: {
        "application/json": { schema: registerDoctorRequestSchema },
      },
    },
  },
  responses: {
    201: {
      description: "Account created",
      content: { "application/json": { schema: successMessageSchema } },
    },
    400: {
      description: "Validation failed",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    409: {
      description: "Email already in use",
      content: { "application/json": { schema: apiErrorSchema } },
    },
    429: {
      description: "Rate limit exceeded",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  },
});

let cachedDocument: ReturnType<OpenApiGeneratorV3["generateDocument"]> | null =
  null;

// Generate once and cache — the spec is fully static so re-running the
// generator on every request would waste CPU.
export function buildOpenApiDocument() {
  if (cachedDocument) return cachedDocument;
  const generator = new OpenApiGeneratorV3(registry.definitions);
  cachedDocument = generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Healthy Paws REST API",
      version: "1.0.0",
      description:
        "REST endpoints for authentication and registration. GraphQL is served from /graphql and is documented through the SDL there.",
    },
    servers: [{ url: "/" }],
    tags: [
      {
        name: "Authentication",
        description: "Login, logout, session, and password reset",
      },
      {
        name: "Registration",
        description: "Owner and doctor sign-up",
      },
    ],
  });
  return cachedDocument;
}
