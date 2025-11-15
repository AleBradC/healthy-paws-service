import * as crypto from "crypto";
import { RegistrationRepository } from "./registration.repository";
import { ErrorMessages, ROLES } from "../../constants";
import { hashPassword } from "../../helpers";
import { RegisterDoctorPayload, RegisterOwnerPayload } from "../../types";

export class RegistrationService {
  private registrationRepository: RegistrationRepository;

  constructor(registrationRepository: RegistrationRepository) {
    this.registrationRepository = registrationRepository;
  }

  public async registerOwner(
    payload: RegisterOwnerPayload
  ): Promise<{ id: string; email: string }> {
    const existingUser = await this.registrationRepository.findUserByEmail(
      payload.owner.email
    );
    if (existingUser) {
      throw new Error(ErrorMessages.ACCOUNT_EXISTS);
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const hash = hashPassword(payload.owner.password!, salt);

    return this.registrationRepository.createOwnerAndPet({
      email: payload.owner.email,
      hash,
      salt,
      role: ROLES.OWNER_ROLE,
      ownerName: payload.owner.name,
      petData: payload.pet,
    });
  }

  public async registerDoctor(
    payload: RegisterDoctorPayload
  ): Promise<{ id: string; email: string }> {
    const existingUser = await this.registrationRepository.findUserByEmail(
      payload.doctor.email
    );
    if (existingUser) {
      throw new Error(ErrorMessages.ACCOUNT_EXISTS);
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const hash = hashPassword(payload.doctor.password!, salt);

    return this.registrationRepository.createDoctorWithDetails({
      email: payload.doctor.email,
      hash,
      salt,
      role: ROLES.DOCTOR_ROLE,
      doctorData: payload.doctor,
    });
  }
}
