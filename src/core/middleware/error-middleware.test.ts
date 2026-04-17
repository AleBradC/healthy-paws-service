import { describe, it, expect, vi, beforeEach } from "vitest";
import { globalErrorHandler } from "./error-middleware";
import { ClientError } from "../../errors/ClientError";
import { SystemError } from "../../errors/SystemError";
import { ClientErrorMessages } from "../../errors/constants";

describe("error-middleware", () => {
  let mockRequest: any;
  let mockResponse: any;
  let nextFunction: any;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    nextFunction = vi.fn();
    vi.clearAllMocks();
  });

  it("should handle ClientError correctly", () => {
    const error = new ClientError("Bad Request", 400);

    globalErrorHandler(error, mockRequest, mockResponse, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: "error",
      message: "Bad Request",
    });
  });

  it("should handle SystemError correctly", () => {
    const error = new SystemError("Internal Server Error", new Error("DB fail"));

    globalErrorHandler(error, mockRequest, mockResponse, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: "error",
      message: ClientErrorMessages.INTERNAL_SERVER_ERROR,
    });
  });

  it("should handle generic Error correctly", () => {
    const error = new Error("Something went wrong");

    globalErrorHandler(error, mockRequest, mockResponse, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status: "error",
      message: ClientErrorMessages.INTERNAL_SERVER_ERROR,
    });
  });
});
