import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAppointmentById,
  createAppointment,
  removeAppointment
} from "./appointments.repository";
import pool from "../../core/config/db";

// Mock the pg pool
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
      const dbRow = { id: "1", appointment_datetime: mockDate, pet_id: "pet_1" };
      
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
        consultation_type: "Physical"
      };

      const mockTransClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      vi.mocked(pool.connect).mockResolvedValue(mockTransClient as any);

      // Simulation: BEGIN, avail DELETE (found), INSERT, COMMIT
      mockTransClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockTransClient.query.mockResolvedValueOnce({ rows: [{ id: 'avail_1' }] }); // DELETE availability
      mockTransClient.query.mockResolvedValueOnce({ rows: [dbRow] }); // INSERT appointment
      mockTransClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await createAppointment(input as any);

      expect(result).toBeDefined();
      expect(result?.status).toBe("Pending");
      expect(mockTransClient.query).toHaveBeenCalledWith(expect.stringContaining("BEGIN"));
      expect(mockTransClient.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO Appointments"), expect.any(Array));
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
        status: "Confirmed" // Current status
      };

      const mockTransClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      vi.mocked(pool.connect).mockResolvedValue(mockTransClient as any);

      mockTransClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockTransClient.query.mockResolvedValueOnce({ rows: [dbRow] }); // SELECT current
      mockTransClient.query.mockResolvedValueOnce({ rows: [] }); // UPDATE to Cancel
      mockTransClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await removeAppointment(input);

      expect(result).toBeDefined();
      expect(mockTransClient.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE Appointments SET status = 'Cancelled'"), expect.any(Array));
      expect(mockTransClient.release).toHaveBeenCalled();
    });
  });
});
