import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAppointmentById,
  createAppointment,
  removeAppointment
} from "./appointments.repository";
import pool from "../../core/config/db";

// Mock the pg pool
vi.mock("../../core/config/db", () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn(),
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
      const dbRow = { id: "1", appointment_datetime: mockDate, pet_id: "pet_1" };
      
      vi.mocked(pool.query).mockResolvedValue({
        rows: [dbRow],
      } as any);

      const result = await getAppointmentById("1");

      expect(result).toBeDefined();
      expect(result?.id).toBe("1");
      expect(result?.datetime).toBe(mockDate.toISOString());
    });

    it("should return null if appointment is not found", async () => {
      vi.mocked(pool.query).mockResolvedValue({
        rows: [],
      } as any);

      const result = await getAppointmentById("999");

      expect(result).toBeNull();
    });
  });

  describe("createAppointment", () => {
    it("should create and return a new appointment", async () => {
      const input = {
        petId: "pet_1",
        doctorId: "doc_1",
        appointmentDatetime: "2023-10-01T10:00:00Z",
        status: "Upcoming",
        consultationType: "Physical",
      };
      
      const mockDate = new Date(input.appointmentDatetime);
      const dbRow = { 
        id: "new_1", 
        pet_id: "pet_1", 
        doctor_id: "doc_1", 
        appointment_datetime: mockDate,
        status: "Upcoming",
        consultation_type: "Physical"
      };

      vi.mocked(pool.query).mockResolvedValue({
        rows: [dbRow],
      } as any);

      const result = await createAppointment(input as any);

      expect(result).toBeDefined();
      expect(result?.id).toBe("new_1");
      expect(result?.datetime).toBe(mockDate.toISOString());
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO Appointments"),
        expect.arrayContaining(["pet_1", "doc_1"])
      );
    });
  });

  describe("removeAppointment", () => {
    it("should update status to 'Cancelled' and return the appointment", async () => {
      const input = { appointmentId: "appt_1" };
      const mockDate = new Date("2023-10-01T10:00:00Z");
      const dbRow = { 
        id: "appt_1", 
        pet_id: "pet_1", 
        doctor_id: "doc_1", 
        appointment_datetime: mockDate,
        status: "Cancelled"
      };

      // Mock client for transaction
      const mockClient = {
        query: vi.fn(),
        connect: vi.fn(),
        release: vi.fn(),
      };
      
      // Mock pool.connect
      vi.mocked(pool.connect).mockResolvedValue(mockClient as any);

      // Mock selection before delete
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [dbRow] }); // SELECT
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // UPDATE
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      // Mock final selection (getAppointmentById uses pool directly)
      vi.mocked(pool.query).mockResolvedValue({
        rows: [dbRow],
      } as any);

      const result = await removeAppointment(input);

      expect(result).toBeDefined();
      expect(result?.status).toBe("Cancelled");
      
      // Verify update query was called instead of delete
      const updateCall = mockClient.query.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes("UPDATE Appointments SET status = 'Cancelled'")
      );
      expect(updateCall).toBeDefined();
    });
  });
});
