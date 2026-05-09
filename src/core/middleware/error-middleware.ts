import { Request, Response, NextFunction } from "express";
import { ClientError } from "../../errors/ClientError";
import { ClientErrorMessages } from "../../errors/constants";
import { SystemError } from "../../errors/SystemError";
import { ApiResponse } from "../../types";

export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof ClientError) {
    const response: ApiResponse = {
      status: "error",
      message: err.message,
    };
    return res.status(err.statusCode).json(response);
  }

  if (err instanceof SystemError) {
    console.error("CRITICAL SYSTEM ERROR:", {
      message: err.message,
      stack: err.stack,
      originalError: err.originalError,
    });

    const response: ApiResponse = {
      status: "error",
      message: ClientErrorMessages.INTERNAL_SERVER_ERROR,
    };
    return res.status(500).json(response);
  }

  console.error("UNHANDLED EXCEPTION:", err);
  const response: ApiResponse = {
    status: "error",
    message: ClientErrorMessages.INTERNAL_SERVER_ERROR,
  };
  return res.status(500).json(response);
};
