import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAppointmentById,
  createAppointment,
  removeAppointment,
  verifyAppointmentOwnership,
} from "./appointments.repository";
import pool from "../../core/config/db";
import { GraphQLError } from "graphql";

const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
};

vi.mock("../../core/config/db", () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn().mockResolvedValue({
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    }),
  },
}));

vi.mock("../doctors/doctors.repository", () => ({
  addDoctorAvailability: vi.fn().mockResolvedValue({}),
}));

describe("AppointmentsRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAppointmentById", () => {
    it("should return an appointment if found", async () => {
      const mockDate = new Date("2023-10-01T10:00:00Z");
      const dbRow = {
        id: "1",
        appointment_datetime: mockDate,
        pet_id: "pet_1",
      };

      vi.mocked(pool.query).mockResolvedValue({
        rows: [dbRow],
      } as any);

      const result = await getAppointmentById("1");

      expect(result).toBeDefined();
      expect(result?.id).toBe("1");
      expect(result?.datetime).toBe(mockDate.toISOString());
    });
  });

  describe("createAppointment", () => {
    it("should create and return a new appointment including availability check", async () => {
      const input = {
        petId: "pet_1",
        doctorId: "doc_1",
        appointmentDatetime: "2023-10-01T10:00:00Z",
        status: "Pending",
        consultationType: "Physical",
      };

      const mockDate = new Date(input.appointmentDatetime);
      const dbRow = {
        id: "new_1",
        pet_id: "pet_1",
        doctor_id: "doc_1",
        appointment_datetime: mockDate,
        status: "Pending",
        consultation_type: "Physical",
      };

      const mockTransClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      vi.mocked(pool.connect).mockResolvedValue(mockTransClient as any);

      mockTransClient.query.mockResolvedValueOnce({ rows: [] });
      mockTransClient.query.mockResolvedValueOnce({
        rows: [{ id: "avail_1" }],
      });
      mockTransClient.query.mockResolvedValueOnce({ rows: [dbRow] });
      mockTransClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await createAppointment(input as any);

      expect(result).toBeDefined();
      expect(result?.status).toBe("Pending");
      expect(mockTransClient.query).toHaveBeenCalledWith(
        expect.stringContaining("BEGIN"),
      );
      expect(mockTransClient.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO Appointments"),
        expect.any(Array),
      );
      expect(mockTransClient.release).toHaveBeenCalled();
    });
  });

  describe("removeAppointment", () => {
    it("should update status to 'Cancel' and restore availability", async () => {
      const input = { appointmentId: "appt_1" };
      const mockDate = new Date("2023-10-01T10:00:00Z");
      const dbRow = {
        id: "appt_1",
        pet_id: "pet_1",
        doctor_id: "doc_1",
        appointment_datetime: mockDate,
        status: "Confirmed",
      };

      const mockTransClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      vi.mocked(pool.connect).mockResolvedValue(mockTransClient as any);

      mockTransClient.query.mockResolvedValueOnce({ rows: [] });
      mockTransClient.query.mockResolvedValueOnce({ rows: [dbRow] });
      mockTransClient.query.mockResolvedValueOnce({ rows: [] });
      mockTransClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await removeAppointment(input);

      expect(result).toBeDefined();
      expect(mockTransClient.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE Appointments SET status = 'Cancelled'"),
        expect.any(Array),
      );
      expect(mockTransClient.release).toHaveBeenCalled();
    });
  });

  describe("verifyAppointmentOwnership", () => {
    it("should not throw if doctor owns the appointment", async () => {
      vi.mocked(pool.query).mockResolvedValue({
        rowCount: 1,
        rows: [{ 1: 1 }],
      } as any);
      await expect(
        verifyAppointmentOwnership("doc-1", "doctor", "appt-1"),
      ).resolves.not.toThrow();
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE id = $1 AND doctor_id = $2"),
        ["appt-1", "doc-1"],
      );
    });

    it("should not throw if owner owns the pet in the appointment", async () => {
      vi.mocked(pool.query).mockResolvedValue({
        rowCount: 1,
        rows: [{ 1: 1 }],
      } as any);
      await expect(
        verifyAppointmentOwnership("owner-1", "owner", "appt-1"),
      ).resolves.not.toThrow();
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("JOIN Pets p ON a.pet_id = p.id"),
        ["appt-1", "owner-1"],
      );
    });

    it("should throw FORBIDDEN error if appointment ownership is not verified", async () => {
      vi.mocked(pool.query).mockResolvedValue({ rowCount: 0, rows: [] } as any);
      try {
        await verifyAppointmentOwnership("user-1", "owner", "appt-2");
      } catch (error) {
        const gqlError = error as GraphQLError;
        expect(gqlError).toBeInstanceOf(GraphQLError);
        expect(gqlError.message).toBe(
          "You do not have permission to access or modify this appointment.",
        );
        expect(gqlError.extensions.code).toBe("FORBIDDEN");
      }
    });
  });
});
