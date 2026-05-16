import { Request, Response, NextFunction } from "express";
import { ROLES } from "../../constants";
import { RegisterDoctorPayload, RegisterOwnerPayload, ApiResponse } from "../../types";
import { RegistrationService } from "./registration.service";
import { ClientErrorMessages, SuccessMessages } from "../../errors/constants";
import { ClientError } from "../../errors/ClientError";
import { ownerSchema, petSchema, doctorSchema } from "./registration.validation";

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

        const ownerResult = ownerSchema.safeParse(owner);
        const petResult = petSchema.safeParse(pet);
        if (!ownerResult.success || !petResult.success) {
          const message =
            ownerResult.error?.issues[0]?.message ??
            petResult.error?.issues[0]?.message ??
            "Invalid input";
          throw new ClientError(message, 400);
        }

        const payload: RegisterOwnerPayload = { owner, pet };
        const newOwner = await this.registrationService.registerOwner(payload);

        const response: ApiResponse<{ user: any }> = {
          status: "success",
          message: SuccessMessages.OWNER_REGISTERED,
          data: {
            user: newOwner,
          }
        };
        res.status(201).json(response);
        return;
      }

      if (role === ROLES.DOCTOR_ROLE) {
        if (!doctor) {
          throw new ClientError(
            ClientErrorMessages.DOCTOR_DETAILS_REQUIRED,
            400
          );
        }

        const doctorResult = doctorSchema.safeParse(doctor);
        if (!doctorResult.success) {
          const message =
            doctorResult.error.issues[0]?.message ?? "Invalid input";
          throw new ClientError(message, 400);
        }

        const newDoctor = await this.registrationService.registerDoctor({
          doctor,
        } as RegisterDoctorPayload);

        const response: ApiResponse<{ user: any }> = {
          status: "success",
          message: SuccessMessages.DOCTOR_REGISTERED,
          data: {
            user: newDoctor,
          }
        };
        res.status(201).json(response);
        return;
      }

      throw new ClientError(ClientErrorMessages.INVALID_ROLE, 400);
    } catch (error) {
      next(error);
    }
  };
}
