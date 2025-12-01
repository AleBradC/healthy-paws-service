import { Request, Response, NextFunction } from "express";
import { ROLES } from "../../constants";
import { RegisterDoctorPayload, RegisterOwnerPayload } from "../../types";
import { RegistrationService } from "./registration.service";
import {
  ClientErrorMessages,
  SuccessMessages,
} from "../../errors.ts/constants";
import { ClientError } from "../../errors.ts/ClientError";

export class RegistrationController {
  private registrationService: RegistrationService;

  constructor(registrationService: RegistrationService) {
    this.registrationService = registrationService;
  }

  public register = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { role, owner, pet, doctor } = req.body;

    try {
      if (role === ROLES.OWNER_ROLE) {
        if (!owner || !pet) {
          throw new ClientError(
            ClientErrorMessages.OWNER_AND_ANIMAL_REQUIRED,
            400
          );
        }

        const payload: RegisterOwnerPayload = { owner, pet };
        const newOwner = await this.registrationService.registerOwner(payload);

        res.status(201).json({
          message: SuccessMessages.OWNER_REGISTERED,
          user: newOwner,
        });
        return;
      }

      if (role === ROLES.DOCTOR_ROLE) {
        if (!doctor) {
          throw new ClientError(
            ClientErrorMessages.DOCTOR_DETAILS_REQUIRED,
            400
          );
        }

        const newDoctor = await this.registrationService.registerDoctor({
          doctor,
        } as RegisterDoctorPayload);

        res.status(201).json({
          message: SuccessMessages.DOCTOR_REGISTERED,
          user: newDoctor,
        });
        return;
      }

      throw new ClientError(ClientErrorMessages.INVALID_ROLE, 400);
    } catch (error) {
      next(error);
    }
  };
}
