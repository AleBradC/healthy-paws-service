import { describe, it, expect, vi, beforeEach } from "vitest";
import { appointmentsResolvers } from "./appointments.resolvers";
import { appointmentsService } from "./appointments.service";
import { GraphQLContext } from "../../schema/loaders";

vi.mock("./appointments.service", () => ({
  appointmentsService: {
    getAppointment: vi.fn().mockResolvedValue({ id: "appt-1", pet_id: "pet-1" }),
    createAppointment: vi.fn().mockResolvedValue({ id: "new-appt", pet_id: "pet-1" }),
    updateAppointment: vi.fn().mockResolvedValue({ id: "appt-1", status: "Confirmed" }),
    removeAppointment: vi.fn().mockResolvedValue({ id: "appt-1", status: "Cancel" }),
    getAppointmentStatus: vi.fn().mockReturnValue("Upcoming"),
  }
}));

describe("appointmentsResolvers", () => {
  let mockContext: GraphQLContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
      user: { id: "user-1", role: "owner" },
    } as unknown as GraphQLContext;
  });

  describe("Query.appointment", () => {
    it("should call appointmentsService.getAppointment and return the appointment", async () => {
      const apptId = "appt-1";
      const result = await appointmentsResolvers.Query.appointment(null, { id: apptId }, mockContext as GraphQLContext);

      expect(appointmentsService.getAppointment).toHaveBeenCalledWith(apptId, "user-1", "owner");
      expect(result).toEqual({ id: apptId, pet_id: "pet-1" });
    });
  });

  describe("Mutation.createAppointment", () => {
    it("should call appointmentsService.createAppointment and return the new appointment", async () => {
      const input = { 
        petId: "pet-1", 
        doctorId: "doc-1", 
        appointmentDatetime: "2023-10-01T10:00:00Z",
        status: "Upcoming",
        consultationType: "Physical"
      } as const;
      const result = await appointmentsResolvers.Mutation.createAppointment(null, { input }, mockContext as GraphQLContext);

      expect(appointmentsService.createAppointment).toHaveBeenCalledWith(input, "user-1");
      expect(result).toEqual({ id: "new-appt", pet_id: "pet-1" });
    });
  });

  describe("Mutation.updateAppointment", () => {
    it("should call appointmentsService.updateAppointment and update the appointment", async () => {
      const input = { appointmentId: "appt-1", status: "Confirmed" };
      const result = await appointmentsResolvers.Mutation.updateAppointment(null, { input }, mockContext as GraphQLContext);

      expect(appointmentsService.updateAppointment).toHaveBeenCalledWith(input, "user-1", "owner");
      expect(result).toEqual({ id: "appt-1", status: "Confirmed" });
    });
  });

  describe("Mutation.removeAppointment", () => {
    it("should call appointmentsService.removeAppointment and remove the appointment", async () => {
      const input = { appointmentId: "appt-1" };
      const result = await appointmentsResolvers.Mutation.removeAppointment(null, { input }, mockContext as GraphQLContext);

      expect(appointmentsService.removeAppointment).toHaveBeenCalledWith(input, "user-1", "owner");
      expect(result).toEqual({ id: "appt-1", status: "Cancel" });
    });
  });
});
