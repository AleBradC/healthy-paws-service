import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAllDoctors, getDoctorsTotalCount, getAllSpecializations } from "./doctors.repository";
import pool from "../../core/config/db";

vi.mock("../../core/config/db", () => ({
  default: {
    query: vi.fn(),
  },
}));

describe("DoctorsRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAllDoctors", () => {
    it("should fetch all doctors with pagination and no name filter", async () => {
      const mockDoctors = [
        { id: "1", name: "Dr. Pop", clinic_name: "Clinic A" },
        { id: "2", name: "Dr. Ionescu", clinic_name: "Clinic B" },
      ];
      vi.mocked(pool.query).mockResolvedValue({ rows: mockDoctors } as any);

      const result = await getAllDoctors(10, 0);

      expect(result).toEqual(mockDoctors);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("OFFSET $1 LIMIT $2"),
        [0, 10]
      );
    });

    it("should fetch doctors with specialization filter", async () => {
      const mockDoctors = [{ id: "1", name: "Dr. Pop", clinic_name: "Clinic A" }];
      vi.mocked(pool.query).mockResolvedValue({ rows: mockDoctors } as any);

      const specId = "spec-1";
      const result = await getAllDoctors(10, 0, undefined, specId);

      expect(result).toEqual(mockDoctors);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("AND ds.specialization_id = $3"),
        [0, 10, specId]
      );
    });

    it("should fetch doctors with both name and specialization filters", async () => {
      const mockDoctors = [{ id: "1", name: "Dr. Pop", clinic_name: "Clinic A" }];
      vi.mocked(pool.query).mockResolvedValue({ rows: mockDoctors } as any);

      const name = "Pop";
      const specId = "spec-1";
      const result = await getAllDoctors(10, 0, name, specId);

      expect(result).toEqual(mockDoctors);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("AND (d.name ILIKE $3 OR d.clinic_name ILIKE $3)"),
        [0, 10, `%${name}%`, specId]
      );
    });
  });

  describe("getDoctorsTotalCount", () => {
    it("should return the total count of doctors without filter", async () => {
      vi.mocked(pool.query).mockResolvedValue({ rows: [{ count: "10" }] } as any);

      const result = await getDoctorsTotalCount();

      expect(result).toBe(10);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT COUNT(*)"),
        []
      );
    });

    it("should return the total count of doctors with both name and specialization filters", async () => {
      vi.mocked(pool.query).mockResolvedValue({ rows: [{ count: "1" }] } as any);

      const name = "Pop";
      const specId = "spec-1";
      const result = await getDoctorsTotalCount(name, specId);

      expect(result).toBe(1);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("AND (d.name ILIKE $1 OR d.clinic_name ILIKE $1)"),
        [`%${name}%`, specId]
      );
    });
  });

  describe("getAllSpecializations", () => {
    it("should return all specializations", async () => {
      const mockSpecs = [{ id: "s1", name: "Surgery" }];
      vi.mocked(pool.query).mockResolvedValue({ rows: mockSpecs } as any);

      const result = await getAllSpecializations();

      expect(result).toEqual(mockSpecs);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT id, name FROM Specializations"),
        undefined
      );
    });
  });
});
