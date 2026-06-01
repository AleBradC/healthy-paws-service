import * as Sentry from "@sentry/node";
import { RegistrationRepository } from "./registration.repository";
import { ROLES } from "../../constants";
import { hashPassword } from "../../helpers";
import { RegisterDoctorPayload, RegisterOwnerPayload } from "../../types";
import { ClientError } from "../../errors/ClientError";
import {
  ClientErrorMessages,
  SystemErrorMessages,
} from "../../errors/constants";
import { SystemError } from "../../errors/SystemError";
export class RegistrationService {
  private registrationRepository: RegistrationRepository;

  constructor(
    registrationRepository: RegistrationRepository
  ) {
    this.registrationRepository = registrationRepository;
  }


  public async registerOwner(
    payload: RegisterOwnerPayload
  ): Promise<{ id: string; email: string }> {
    try {
      const normalizedEmail = payload.owner.email.trim().toLowerCase();
      const existingUser = await this.registrationRepository.findUserByEmail(
        normalizedEmail
      );

      if (existingUser) {
        throw new ClientError(ClientErrorMessages.ACCOUNT_EXISTS, 409);
      }

      const hash = await hashPassword(payload.owner.password!);

      const created = await this.registrationRepository.createOwnerAndPet({
        email: normalizedEmail,
        hash,
        role: ROLES.OWNER_ROLE,
        ownerName: payload.owner.name,
        petData: payload.pet,
      });

      return created;
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
      const normalizedEmail = payload.doctor.email.trim().toLowerCase();
      const existingUser = await this.registrationRepository.findUserByEmail(
        normalizedEmail
      );

      if (existingUser) {
        throw new ClientError(ClientErrorMessages.ACCOUNT_EXISTS, 409);
      }

      const hash = await hashPassword(payload.doctor.password!);

      const created = await this.registrationRepository.createDoctorWithDetails({
        email: normalizedEmail,
        hash,
        role: ROLES.DOCTOR_ROLE,
        doctorData: payload.doctor,
      });

      return created;
    } catch (err) {
      if (err instanceof ClientError || err instanceof SystemError) {
        throw err;
      }
      throw new SystemError(SystemErrorMessages.DB_TRANSACTION_FAILED, err);
    }
  }
}
