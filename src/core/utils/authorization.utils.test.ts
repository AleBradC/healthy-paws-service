import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
  verifyDoctorOwnership, 
  verifyOwnerOwnership, 
  verifyPetOwnership, 
  verifyAppointmentOwnership 
} from "./authorization.utils";
import pool from "../config/db";
import { GraphQLError } from "graphql";

vi.mock("../config/db", () => ({
  default: {
    query: vi.fn(),
  },
}));

describe("authorizationUtils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  describe("verifyPetOwnership", () => {
    it("should not throw if pet belongs to owner", async () => {
      vi.mocked(pool.query).mockResolvedValue({ rowCount: 1, rows: [{ 1: 1 }] } as any);
      await expect(verifyPetOwnership("owner-1", "pet-1")).resolves.not.toThrow();
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE id = $1 AND owner_id = $2"),
        ["pet-1", "owner-1"]
      );
    });

    it("should throw FORBIDDEN error if pet does not belong to owner", async () => {
      vi.mocked(pool.query).mockResolvedValue({ rowCount: 0, rows: [] } as any);
      try {
        await verifyPetOwnership("owner-1", "pet-2");
      } catch (error) {
        const gqlError = error as GraphQLError;
        expect(gqlError).toBeInstanceOf(GraphQLError);
        expect(gqlError.message).toBe("You do not have permission to modify this pet record.");
        expect(gqlError.extensions.code).toBe("FORBIDDEN");
      }
    });
  });

  describe("verifyAppointmentOwnership", () => {
    it("should not throw if doctor owns the appointment", async () => {
      vi.mocked(pool.query).mockResolvedValue({ rowCount: 1, rows: [{ 1: 1 }] } as any);
      await expect(verifyAppointmentOwnership("doc-1", "doctor", "appt-1")).resolves.not.toThrow();
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE id = $1 AND doctor_id = $2"),
        ["appt-1", "doc-1"]
      );
    });

    it("should not throw if owner owns the pet in the appointment", async () => {
      vi.mocked(pool.query).mockResolvedValue({ rowCount: 1, rows: [{ 1: 1 }] } as any);
      await expect(verifyAppointmentOwnership("owner-1", "owner", "appt-1")).resolves.not.toThrow();
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("JOIN Pets p ON a.pet_id = p.id"),
        ["appt-1", "owner-1"]
      );
    });

    it("should throw FORBIDDEN error if appointment ownership is not verified", async () => {
      vi.mocked(pool.query).mockResolvedValue({ rowCount: 0, rows: [] } as any);
      try {
        await verifyAppointmentOwnership("user-1", "owner", "appt-2");
      } catch (error) {
        const gqlError = error as GraphQLError;
        expect(gqlError).toBeInstanceOf(GraphQLError);
        expect(gqlError.message).toBe("You do not have permission to access or modify this appointment.");
        expect(gqlError.extensions.code).toBe("FORBIDDEN");
      }
    });
  });
});
