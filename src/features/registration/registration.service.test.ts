import { describe, it, expect, vi, beforeEach } from "vitest";
import { RegistrationService } from "./registration.service";
import { RegistrationRepository } from "./registration.repository";

import { ClientError } from "../../errors/ClientError";

vi.mock("./registration.repository");
vi.mock("../../helpers", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed_password"),
}));

describe("RegistrationService", () => {
  let registrationService: RegistrationService;
  let registrationRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    registrationRepo = new RegistrationRepository({} as any);
    registrationService = new RegistrationService(
      registrationRepo
    );
  });

  describe("registerOwner", () => {
    const payload = {
      owner: { name: "John Doe", email: "john@example.com", password: "password123" },
      pet: { name: "Buddy", type: "Dog", breed: "Labrador", age: 3, weight: 30 },
    } as any;

    it("should successfully register an owner and pet", async () => {
      registrationRepo.findUserByEmail.mockResolvedValue(null);
      registrationRepo.createOwnerAndPet.mockResolvedValue({ id: "user_123", email: "john@example.com" });

      const result = await registrationService.registerOwner(payload);

      expect(result).toEqual({ id: "user_123", email: "john@example.com" });
      expect(registrationRepo.findUserByEmail).toHaveBeenCalledWith(payload.owner.email);
      expect(registrationRepo.createOwnerAndPet).toHaveBeenCalled();
    });

    it("should throw a ClientError if email is already registered", async () => {
      registrationRepo.findUserByEmail.mockResolvedValue({ id: "user_123" });

      await expect(registrationService.registerOwner(payload)).rejects.toThrow(ClientError);
    });
  });

  describe("registerDoctor", () => {
    const payload = {
      doctor: { 
        name: "Dr. Smith", 
        email: "smith@example.com", 
        password: "password123",
        clinicName: "Vet Clinic",
        clinicAddress: "123 Street",
        specializations: []
      },
    } as any;

    it("should successfully register a doctor", async () => {
      registrationRepo.findUserByEmail.mockResolvedValue(null);
      registrationRepo.createDoctorWithDetails.mockResolvedValue({ id: "doctor_123", email: "smith@example.com" });

      const result = await registrationService.registerDoctor(payload);

      expect(result).toEqual({ id: "doctor_123", email: "smith@example.com" });
      expect(registrationRepo.findUserByEmail).toHaveBeenCalledWith(payload.doctor.email);
      expect(registrationRepo.createDoctorWithDetails).toHaveBeenCalled();
    });

    it("should throw a ClientError if email is already registered", async () => {
      registrationRepo.findUserByEmail.mockResolvedValue({ id: "doctor_123" });

      await expect(registrationService.registerDoctor(payload)).rejects.toThrow(ClientError);
    });
  });
});
