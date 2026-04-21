import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAllDoctors, getDoctorsTotalCount } from "./doctors.repository";
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

    it("should fetch doctors with name filter matching doctor name or clinic name", async () => {
      const mockDoctors = [{ id: "1", name: "Dr. Pop", clinic_name: "Clinic A" }];
      vi.mocked(pool.query).mockResolvedValue({ rows: mockDoctors } as any);

      const searchTerm = "Pop";
      const result = await getAllDoctors(10, 0, searchTerm);

      expect(result).toEqual(mockDoctors);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("AND (d.name ILIKE $3 OR d.clinic_name ILIKE $3)"),
        [0, 10, `%${searchTerm}%`]
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

    it("should return the total count of doctors with name filter", async () => {
      vi.mocked(pool.query).mockResolvedValue({ rows: [{ count: "3" }] } as any);

      const searchTerm = "Clinic";
      const result = await getDoctorsTotalCount(searchTerm);

      expect(result).toBe(3);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("AND (d.name ILIKE $1 OR d.clinic_name ILIKE $1)"),
        [`%${searchTerm}%`]
      );
    });
  });
});
