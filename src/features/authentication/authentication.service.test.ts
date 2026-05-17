import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthenticationService } from "./authentication.service";
import { AuthenticationRepository } from "./authentication.repository";
import * as jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

vi.mock("./authentication.repository");
vi.mock("jsonwebtoken", () => ({
  sign: vi.fn(),
  verify: vi.fn(),
}));
vi.mock("nodemailer");

describe("AuthenticationService", () => {
  let authService: AuthenticationService;
  let authRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    authRepo = new AuthenticationRepository({} as any);
    authService = new AuthenticationService(authRepo);
  });

  describe("generateAccessToken", () => {
    it("delegates to jwt.sign with the centralised JWT_CONFIG", () => {
      const payload = {
        id: "123",
        email: "test@example.com",
        role: "owner" as any,
      };
      vi.mocked(jwt.sign).mockReturnValue("fake_token" as any);

      const token = authService.generateAccessToken(payload);

      expect(token).toBe("fake_token");
      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        expect.any(String),
        expect.objectContaining({ expiresIn: expect.anything() })
      );
    });
  });

  describe("startPasswordReset", () => {
    it("creates a token row and sends a link email when the user exists", async () => {
      const email = "test@example.com";
      authRepo.findUserByEmail.mockResolvedValue({ id: "user_123", email });

      const mockSendMail = vi.fn().mockResolvedValue({ messageId: "123" });
      vi.mocked(nodemailer.createTransport).mockReturnValue({
        sendMail: mockSendMail,
      } as any);

      await authService.startPasswordReset(email);

      expect(authRepo.findUserByEmail).toHaveBeenCalledWith(email);
      expect(authRepo.invalidatePreviousTokens).toHaveBeenCalledWith("user_123");
      // (userId, sha256HexHash, expiresAt) — never the raw token.
      expect(authRepo.createResetToken).toHaveBeenCalledWith(
        "user_123",
        expect.stringMatching(/^[a-f0-9]{64}$/),
        expect.any(Date)
      );
      expect(mockSendMail).toHaveBeenCalled();
    });

    it("silently succeeds when the email is unknown (no DB writes, no mail)", async () => {
      authRepo.findUserByEmail.mockResolvedValue(null);
      const mockSendMail = vi.fn();
      vi.mocked(nodemailer.createTransport).mockReturnValue({
        sendMail: mockSendMail,
      } as any);

      await expect(
        authService.startPasswordReset("unknown@example.com")
      ).resolves.toBeUndefined();

      expect(authRepo.invalidatePreviousTokens).not.toHaveBeenCalled();
      expect(authRepo.createResetToken).not.toHaveBeenCalled();
      expect(mockSendMail).not.toHaveBeenCalled();
    });
  });

  describe("resetPassword", () => {
    it("rejects an unknown token with INVALID_RESET_TOKEN", async () => {
      authRepo.findValidResetToken.mockResolvedValue(null);

      await expect(
        authService.resetPassword("bogus-token", "Password1!")
      ).rejects.toThrow(/reset link/i);

      expect(authRepo.updateUserPassword).not.toHaveBeenCalled();
      expect(authRepo.markResetTokenUsed).not.toHaveBeenCalled();
    });

    it("updates the password and marks the token used on success", async () => {
      authRepo.findValidResetToken.mockResolvedValue({
        id: "token_1",
        user_id: "user_123",
      });
      authRepo.updateUserPassword.mockResolvedValue(undefined);
      authRepo.markResetTokenUsed.mockResolvedValue(undefined);

      await authService.resetPassword("raw-token", "Password1!");

      expect(authRepo.findValidResetToken).toHaveBeenCalledWith(
        expect.stringMatching(/^[a-f0-9]{64}$/)
      );
      expect(authRepo.updateUserPassword).toHaveBeenCalledWith(
        "user_123",
        expect.any(String)
      );
      expect(authRepo.markResetTokenUsed).toHaveBeenCalledWith("token_1");
    });
  });
});
