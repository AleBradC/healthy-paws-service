import { Request, Response, NextFunction } from "express";
import { ClientError, SystemError } from "../../errors/ClientError";
import { ClientErrorMessages } from "../../errors/constants";

export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof ClientError) {
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message,
    });
  }

  if (err instanceof SystemError) {
    console.error("CRITICAL SYSTEM ERROR:", {
      message: err.message,
      stack: err.stack,
      originalError: err.originalError,
    });

    return res.status(500).json({
      status: "error",
      message: ClientErrorMessages.INTERNAL_SERVER_ERROR,
    });
  }

  console.error("UNHANDLED EXCEPTION:", err);
  return res.status(500).json({
    status: "error",
    message: ClientErrorMessages.INTERNAL_SERVER_ERROR,
  });
};
