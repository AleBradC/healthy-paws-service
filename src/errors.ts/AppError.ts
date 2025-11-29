export class ClientError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = "ClientError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class SystemError extends Error {
  public readonly statusCode: number;
  public readonly originalError?: any;

  constructor(logMessage: string, originalError?: any) {
    super(logMessage); // for server logs
    this.statusCode = 500;
    this.name = "SystemError";
    this.originalError = originalError;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
