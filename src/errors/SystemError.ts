export class SystemError extends Error {
  public readonly statusCode: number;
  public readonly originalError?: any;

  constructor(logMessage: string, originalError?: any) {
    super(logMessage);
    this.statusCode = 500;
    this.name = "SystemError";
    this.originalError = originalError;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
