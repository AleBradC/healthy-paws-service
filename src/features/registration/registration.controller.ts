import { Request, Response, NextFunction } from "express";
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

  public registerOwner = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { owner, pet } = req.body;

    try {
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
        data: { user: newOwner },
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  public registerDoctor = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { doctor } = req.body;

    try {
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
        data: { user: newDoctor },
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };
}
