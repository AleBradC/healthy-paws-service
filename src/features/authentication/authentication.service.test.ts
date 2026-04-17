import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthenticationService } from "./authentication.service";
import { AuthenticationRepository } from "./authentication.repository";
import * as jwt from "jsonwebtoken";
import * as crypto from "crypto";
import nodemailer from "nodemailer";
import { ClientError } from "../../errors/ClientError";

// Mock dependencies
vi.mock("./authentication.repository");
vi.mock("jsonwebtoken", () => ({
  sign: vi.fn(),
  verify: vi.fn(),
}));
vi.mock("nodemailer");
vi.mock("crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("crypto")>();
  return {
    ...actual,
    randomInt: vi.fn(),
  };
});

describe("AuthenticationService", () => {
  let authService: AuthenticationService;
  let authRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    authRepo = new AuthenticationRepository({} as any);
    authService = new AuthenticationService(authRepo);
  });

  describe("generateAccessToken", () => {
    it("should generate a token using JWT secret", () => {
      process.env.JWT_SECRET = "test_secret";
      const payload = { id: "123", email: "test@example.com", role: "owner" as any };
      vi.mocked(jwt.sign).mockReturnValue("fake_token" as any);

      const token = authService.generateAccessToken(payload);

      expect(token).toBe("fake_token");
      expect(jwt.sign).toHaveBeenCalledWith(payload, "test_secret", { expiresIn: "1h" });
    });

    it("should throw a SystemError if JWT_SECRET is missing", () => {
      delete process.env.JWT_SECRET;
      const payload = { id: "123", email: "test@example.com", role: "owner" as any };

      expect(() => authService.generateAccessToken(payload)).toThrow();
    });
  });

  describe("startPasswordReset", () => {
    it("should generate a reset token and send an email", async () => {
      const email = "test@example.com";
      const user = { id: "user_123", email };
      authRepo.findUserByEmail.mockResolvedValue(user);
      vi.mocked(crypto.randomInt).mockReturnValue(123456 as any);
      
      const mockSendMail = vi.fn().mockResolvedValue({ messageId: "123" });
      vi.mocked(nodemailer.createTransport).mockReturnValue({
        sendMail: mockSendMail,
      } as any);

      await authService.startPasswordReset(email);

      expect(authRepo.findUserByEmail).toHaveBeenCalledWith(email);
      expect(authRepo.createResetToken).toHaveBeenCalledWith(
        user.id,
        "123456",
        expect.any(Date)
      );
      expect(mockSendMail).toHaveBeenCalled();
    });

    it("should throw a ClientError if user is not found", async () => {
      authRepo.findUserByEmail.mockResolvedValue(null);

      await expect(authService.startPasswordReset("wrong@example.com")).rejects.toThrow(ClientError);
    });
  });

  describe("verifyResetCode", () => {
    it("should return true if token is valid", async () => {
      const email = "test@example.com";
      const code = "123456";
      const user = { id: "user_123", email };
      authRepo.findUserByEmail.mockResolvedValue(user);
      authRepo.findValidResetToken.mockResolvedValue({ id: "token_123" });

      const isValid = await authService.verifyResetCode(email, code);

      expect(isValid).toBe(true);
      expect(authRepo.findValidResetToken).toHaveBeenCalledWith(user.id, code);
    });

    it("should return false if user is not found", async () => {
      authRepo.findUserByEmail.mockResolvedValue(null);
      const isValid = await authService.verifyResetCode("wrong@example.com", "123456");
      expect(isValid).toBe(false);
    });
  });
});
