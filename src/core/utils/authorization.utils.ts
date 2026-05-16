import { GraphQLError } from "graphql";

/**
 * Verifies that a doctor record belongs to the specified user.
 * The roleId from the token IS the doctorId for doctors.
 */
export async function verifyDoctorOwnership(roleId: string, doctorId: string): Promise<void> {
  if (roleId !== doctorId) {
    throw new GraphQLError("You do not have permission to modify this doctor profile.", {
      extensions: { code: "FORBIDDEN" },
    });
  }
}

/**
 * Verifies that an owner record belongs to the specified user.
 * The roleId from the token IS the ownerId for owners.
 */
export async function verifyOwnerOwnership(roleId: string, ownerId: string): Promise<void> {
  if (roleId !== ownerId) {
    throw new GraphQLError("You do not have permission to modify this owner profile.", {
      extensions: { code: "FORBIDDEN" },
    });
  }
}
