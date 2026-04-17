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

      const hash = await hashPassword(payload.owner.password!);

      return await this.registrationRepository.createOwnerAndPet({
        email: payload.owner.email,
        hash,
        salt: "", // bcrypt salt is embedded in the hash
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

      const hash = await hashPassword(payload.doctor.password!);

      return await this.registrationRepository.createDoctorWithDetails({
        email: payload.doctor.email,
        hash,
        salt: "", // bcrypt salt is embedded in the hash
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
