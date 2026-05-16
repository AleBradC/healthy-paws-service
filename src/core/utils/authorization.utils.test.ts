import { describe, it, expect } from "vitest";
import {
  verifyDoctorOwnership,
  verifyOwnerOwnership,
} from "./authorization.utils";
import { GraphQLError } from "graphql";

describe("authorizationUtils", () => {
  describe("verifyDoctorOwnership", () => {
    it("should not throw if roleId matches doctorId", async () => {
      await expect(verifyDoctorOwnership("doc-1", "doc-1")).resolves.not.toThrow();
    });

    it("should throw FORBIDDEN error if roleId does not match doctorId", async () => {
      try {
        await verifyDoctorOwnership("doc-1", "doc-2");
      } catch (error) {
        const gqlError = error as GraphQLError;
        expect(gqlError).toBeInstanceOf(GraphQLError);
        expect(gqlError.message).toBe("You do not have permission to modify this doctor profile.");
        expect(gqlError.extensions.code).toBe("FORBIDDEN");
      }
    });
  });

  describe("verifyOwnerOwnership", () => {
    it("should not throw if roleId matches ownerId", async () => {
      await expect(verifyOwnerOwnership("owner-1", "owner-1")).resolves.not.toThrow();
    });

    it("should throw FORBIDDEN error if roleId does not match ownerId", async () => {
      try {
        await verifyOwnerOwnership("owner-1", "owner-2");
      } catch (error) {
        const gqlError = error as GraphQLError;
        expect(gqlError).toBeInstanceOf(GraphQLError);
        expect(gqlError.message).toBe("You do not have permission to modify this owner profile.");
        expect(gqlError.extensions.code).toBe("FORBIDDEN");
      }
    });
  });
});
