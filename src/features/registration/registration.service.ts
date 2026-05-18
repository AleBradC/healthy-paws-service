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
import { EmailVerificationService } from "../email-verification/email-verification.service";

export class RegistrationService {
  private registrationRepository: RegistrationRepository;
  private emailVerificationService: EmailVerificationService;

  constructor(
    registrationRepository: RegistrationRepository,
    emailVerificationService: EmailVerificationService
  ) {
    this.registrationRepository = registrationRepository;
    this.emailVerificationService = emailVerificationService;
  }

  // Best-effort verification email dispatch. We deliberately do not roll back
  // the account on email failure: the user exists, they can request a resend
  // from the login page. Throwing here would leak account creation state to
  // the caller and complicate the rate-limited resend flow.
  private async dispatchVerification(userId: string, email: string): Promise<void> {
    try {
      await this.emailVerificationService.issueAndSendForNewUser(userId, email);
    } catch (err) {
      console.error("Verification email dispatch failed:", {
        userId,
        err: err instanceof Error ? err.message : String(err),
      });
      Sentry.captureException(err, {
        tags: { error_class: "VerificationDispatchFailed" },
      });
    }
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

      await this.dispatchVerification(created.id, created.email);
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

      await this.dispatchVerification(created.id, created.email);
      return created;
    } catch (err) {
      if (err instanceof ClientError || err instanceof SystemError) {
        throw err;
      }
      throw new SystemError(SystemErrorMessages.DB_TRANSACTION_FAILED, err);
    }
  }
}
