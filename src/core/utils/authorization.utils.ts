import { GraphQLError } from "graphql";

export async function verifyDoctorOwnership(
  roleId: string,
  doctorId: string,
): Promise<void> {
  if (roleId !== doctorId) {
    throw new GraphQLError(
      "You do not have permission to modify this doctor profile.",
      {
        extensions: { code: "FORBIDDEN" },
      },
    );
  }
}

export async function verifyOwnerOwnership(
  roleId: string,
  ownerId: string,
): Promise<void> {
  if (roleId !== ownerId) {
    throw new GraphQLError(
      "You do not have permission to modify this owner profile.",
      {
        extensions: { code: "FORBIDDEN" },
      },
    );
  }
}
