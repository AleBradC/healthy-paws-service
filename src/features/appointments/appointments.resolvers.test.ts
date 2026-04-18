import { describe, it, expect, vi, beforeEach } from "vitest";
import { appointmentsResolvers } from "./appointments.resolvers";
import { verifyAppointmentOwnership, verifyPetOwnership } from "../../core/utils/authorization.utils";
import { GraphQLContext } from "../../schema/loaders";

vi.mock("../../core/utils/authorization.utils", () => ({
  verifyAppointmentOwnership: vi.fn(),
  verifyPetOwnership: vi.fn(),
}));

vi.mock("./appointments.repository", () => ({
  getAppointmentById: vi.fn().mockResolvedValue({ id: "appt-1", pet_id: "pet-1" }),
  createAppointment: vi.fn().mockResolvedValue({ id: "new-appt", pet_id: "pet-1" }),
  updateAppointment: vi.fn().mockResolvedValue({ id: "appt-1", status: "Confirmed" }),
  removeAppointment: vi.fn().mockResolvedValue({ id: "appt-1", status: "Cancelled" }),
}));

describe("appointmentsResolvers", () => {
  let mockContext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
      user: { id: "user-1", role: "owner" },
    };
  });

  describe("Query.appointment", () => {
    it("should call verifyAppointmentOwnership and return the appointment", async () => {
      const apptId = "appt-1";
      const result = await appointmentsResolvers.Query.appointment(null, { id: apptId }, mockContext as GraphQLContext);

      expect(verifyAppointmentOwnership).toHaveBeenCalledWith("user-1", "owner", apptId);
      expect(result).toEqual({ id: apptId, pet_id: "pet-1" });
    });
  });

  describe("Mutation.createAppointment", () => {
    it("should call verifyPetOwnership and create an appointment", async () => {
      const input = { 
        petId: "pet-1", 
        doctorId: "doc-1", 
        appointmentDatetime: "2023-10-01T10:00:00Z",
        status: "Upcoming",
        consultationType: "Physical"
      } as const;
      const result = await appointmentsResolvers.Mutation.createAppointment(null, { input }, mockContext as GraphQLContext);

      expect(verifyPetOwnership).toHaveBeenCalledWith("user-1", "pet-1");
      expect(result).toEqual({ id: "new-appt", pet_id: "pet-1" });
    });
  });

  describe("Mutation.updateAppointment", () => {
    it("should call verifyAppointmentOwnership and update the appointment", async () => {
      const input = { appointmentId: "appt-1", status: "Confirmed" };
      const result = await appointmentsResolvers.Mutation.updateAppointment(null, { input }, mockContext as GraphQLContext);

      expect(verifyAppointmentOwnership).toHaveBeenCalledWith("user-1", "owner", "appt-1");
      expect(result).toEqual({ id: "appt-1", status: "Confirmed" });
    });
  });

  describe("Mutation.removeAppointment", () => {
    it("should call verifyAppointmentOwnership and remove the appointment", async () => {
      const input = { appointmentId: "appt-1" };
      const result = await appointmentsResolvers.Mutation.removeAppointment(null, { input }, mockContext as GraphQLContext);

      expect(verifyAppointmentOwnership).toHaveBeenCalledWith("user-1", "owner", "appt-1");
      expect(result).toEqual({ id: "appt-1", status: "Cancelled" });
    });
  });
});
