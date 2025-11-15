import { Request, Response } from "express";
import { ROLES } from "../../constants";
import { RegisterDoctorPayload, RegisterOwnerPayload } from "../../types";
import { RegistrationService } from "./registration.service";

export class RegistrationController {
  private registrationService: RegistrationService;

  constructor(registrationService: RegistrationService) {
    this.registrationService = registrationService;
  }

  public register = async (req: Request, res: Response): Promise<Response> => {
    const { role, owner, pet, doctor } = req.body;

    try {
      if (role === ROLES.OWNER_ROLE) {
        if (!owner || !pet) {
          return res
            .status(400)
            .json({ message: "Owner and animal details are required." });
        }

        const payload: RegisterOwnerPayload = { owner, pet };
        const newOwner = await this.registrationService.registerOwner(payload);
        return res.status(201).json({
          message: "Pet owner registered successfully.",
          user: newOwner,
        });
      } else if (role === ROLES.DOCTOR_ROLE) {
        if (!doctor) {
          return res
            .status(400)
            .json({ message: "Doctor details are required." });
        }

        const newDoctor = await this.registrationService.registerDoctor({
          doctor,
        } as RegisterDoctorPayload);
        return res.status(201).json({
          message: "Doctor registered successfully.",
          user: newDoctor,
        });
      } else {
        return res.status(400).json({
          message: "A valid role ('owner' or 'doctor') must be specified.",
        });
      }
    } catch (error: any) {
      if (error.message.includes("already exists")) {
        return res
          .status(409)
          .json({ message: "An account with this email already exists." });
      }
      console.error("Registration Error:", error);
      return res
        .status(500)
        .json({ message: "An internal server error occurred." });
    }
  };
}
