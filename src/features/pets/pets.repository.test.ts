import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifyPetOwnership, verifyPetAccess } from "./pets.repository";
import pool from "../../core/config/db";
import { GraphQLError } from "graphql";

vi.mock("../../core/config/db", () => ({
  default: {
    query: vi.fn(),
  },
}));

describe("PetsRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  describe("verifyPetAccess", () => {
    it("should not throw if owner accesses their own pet", async () => {
      vi.mocked(pool.query).mockResolvedValue({ rowCount: 1, rows: [{ 1: 1 }] } as any);
      await expect(verifyPetAccess("owner-1", "owner", "pet-1")).resolves.not.toThrow();
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE id = $1 AND owner_id = $2"),
        ["pet-1", "owner-1"]
      );
    });

    it("should throw FORBIDDEN error if owner accesses another owner's pet", async () => {
      vi.mocked(pool.query).mockResolvedValue({ rowCount: 0, rows: [] } as any);
      await expect(verifyPetAccess("owner-1", "owner", "pet-2")).rejects.toThrow(
        "You do not have permission to access this pet record."
      );
    });

    it("should not throw if doctor has an appointment with the pet", async () => {
      vi.mocked(pool.query).mockResolvedValue({ rowCount: 1, rows: [{ 1: 1 }] } as any);
      await expect(verifyPetAccess("doctor-1", "doctor", "pet-1")).resolves.not.toThrow();
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE pet_id = $1 AND doctor_id = $2"),
        ["pet-1", "doctor-1"]
      );
    });

    it("should throw FORBIDDEN error if doctor has no appointment with the pet", async () => {
      vi.mocked(pool.query).mockResolvedValue({ rowCount: 0, rows: [] } as any);
      await expect(verifyPetAccess("doctor-1", "doctor", "pet-1")).rejects.toThrow(
        "You do not have permission to access this pet record."
      );
    });
  });
});
