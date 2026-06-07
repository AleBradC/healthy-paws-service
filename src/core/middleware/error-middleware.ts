import { Request, Response, NextFunction } from "express";
import * as Sentry from "@sentry/node";
import { ClientError } from "../../errors/ClientError";
import { ClientErrorMessages } from "../../errors/constants";
import { SystemError } from "../../errors/SystemError";
import { ApiResponse } from "../utils/types";

// body-parser tags its PayloadTooLargeError with `type: "entity.too.large"`,
// which is more specific than just checking `statusCode === 413`.
const isPayloadTooLargeError = (err: unknown): boolean =>
  !!err &&
  typeof err === "object" &&
  (err as { type?: string }).type === "entity.too.large";

export const globalErrorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof ClientError) {
    const response: ApiResponse = {
      status: "error",
      message: err.message,
    };
    return res.status(err.statusCode).json(response);
  }

  if (isPayloadTooLargeError(err)) {
    const response: ApiResponse = {
      status: "error",
      message: ClientErrorMessages.PAYLOAD_TOO_LARGE,
    };
    return res.status(413).json(response);
  }

  if (err instanceof SystemError) {
    console.error("CRITICAL SYSTEM ERROR:", {
      message: err.message,
      stack: err.stack,
      originalError: err.originalError,
    });
    // Capture the wrapped originalError when present so Sentry groups by the
    // real cause (e.g. a Postgres error code) instead of by the SystemError
    // wrapper, which has the same stack frame for every DB failure.
    Sentry.captureException(err.originalError ?? err, {
      tags: { error_class: "SystemError" },
      extra: { message: err.message },
    });

    const response: ApiResponse = {
      status: "error",
      message: ClientErrorMessages.INTERNAL_SERVER_ERROR,
    };
    return res.status(500).json(response);
  }

  console.error("UNHANDLED EXCEPTION:", err);
  Sentry.captureException(err, { tags: { error_class: "Unhandled" } });
  const response: ApiResponse = {
    status: "error",
    message: ClientErrorMessages.INTERNAL_SERVER_ERROR,
  };
  return res.status(500).json(response);
};
