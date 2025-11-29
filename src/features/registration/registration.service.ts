import * as crypto from "crypto";
import { RegistrationRepository } from "./registration.repository";
import { ROLES } from "../../constants";
import { hashPassword } from "../../helpers";
import { RegisterDoctorPayload, RegisterOwnerPayload } from "../../types";
import { ClientError, SystemError } from "../../errors.ts/AppError";
import {
  ClientErrorMessages,
  SystemErrorMessages,
} from "../../errors.ts/constants";

export class RegistrationService {
  private registrationRepository: RegistrationRepository;

  constructor(registrationRepository: RegistrationRepository) {
    this.registrationRepository = registrationRepository;
  }

  public async registerOwner(
    payload: RegisterOwnerPayload
  ): Promise<{ id: string; email: string }> {
    try {
      const existingUser = await this.registrationRepository.findUserByEmail(
        payload.owner.email
      );

      if (existingUser) {
        throw new ClientError(ClientErrorMessages.ACCOUNT_EXISTS, 409);
      }

      const salt = crypto.randomBytes(16).toString("hex");
      const hash = hashPassword(payload.owner.password!, salt);

      return await this.registrationRepository.createOwnerAndPet({
        email: payload.owner.email,
        hash,
        salt,
        role: ROLES.OWNER_ROLE,
        ownerName: payload.owner.name,
        petData: payload.pet,
      });
    } catch (err) {
      if (err instanceof ClientError || err instanceof SystemError) {
        throw err;
      }
      throw new SystemError(SystemErrorMessages.DB_TRANSACTION_FAILED, err);
    }
  }

  public async registerDoctor(
    payload: RegisterDoctorPayload
  ): Promise<{ id: string; email: string }> {
    try {
      const existingUser = await this.registrationRepository.findUserByEmail(
        payload.doctor.email
      );

      if (existingUser) {
        throw new ClientError(ClientErrorMessages.ACCOUNT_EXISTS, 409);
      }

      const salt = crypto.randomBytes(16).toString("hex");
      const hash = hashPassword(payload.doctor.password!, salt);

      return await this.registrationRepository.createDoctorWithDetails({
        email: payload.doctor.email,
        hash,
        salt,
        role: ROLES.DOCTOR_ROLE,
        doctorData: payload.doctor,
      });
    } catch (err) {
      if (err instanceof ClientError || err instanceof SystemError) {
        throw err;
      }
      throw new SystemError(SystemErrorMessages.DB_TRANSACTION_FAILED, err);
    }
  }
}
