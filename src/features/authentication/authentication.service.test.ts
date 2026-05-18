import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthenticationService } from "./authentication.service";
import { AuthenticationRepository } from "./authentication.repository";
import * as jwt from "jsonwebtoken";
import { sendMail } from "../../core/mailer";

vi.mock("./authentication.repository");
vi.mock("jsonwebtoken", () => ({
  sign: vi.fn(),
  verify: vi.fn(),
  decode: vi.fn(),
}));
vi.mock("../../core/mailer", () => ({
  sendMail: vi.fn(),
}));

const mockedSendMail = vi.mocked(sendMail);

describe("AuthenticationService", () => {
  let authService: AuthenticationService;
  let authRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    authRepo = new AuthenticationRepository({} as any);
    authService = new AuthenticationService(authRepo);
  });

  describe("generateAccessToken", () => {
    it("delegates to jwt.sign with the centralised JWT_CONFIG and returns expiry derived from the token", () => {
      const payload = {
        id: "123",
        email: "test@example.com",
        role: "owner" as any,
      };
      const futureSec = Math.floor(Date.now() / 1000) + 3600;
      vi.mocked(jwt.sign).mockReturnValue("fake_token" as any);
      vi.mocked(jwt.decode).mockReturnValue({ exp: futureSec } as any);

      const result = authService.generateAccessToken(payload);

      expect(result.token).toBe("fake_token");
      expect(result.expiresAtMs).toBe(futureSec * 1000);
      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        expect.any(String),
        expect.objectContaining({ expiresIn: expect.anything() })
      );
    });

    it("throws when the signed token cannot be decoded for an exp claim", () => {
      const payload = {
        id: "123",
        email: "test@example.com",
        role: "owner" as any,
      };
      vi.mocked(jwt.sign).mockReturnValue("fake_token" as any);
      vi.mocked(jwt.decode).mockReturnValue(null as any);

      expect(() => authService.generateAccessToken(payload)).toThrow();
    });
  });

  describe("startPasswordReset", () => {
    it("creates a token row and sends a link email when the user exists", async () => {
      const email = "test@example.com";
      authRepo.findUserByEmail.mockResolvedValue({ id: "user_123", email });
      mockedSendMail.mockResolvedValue(undefined);

      await authService.startPasswordReset(email);

      expect(authRepo.findUserByEmail).toHaveBeenCalledWith(email);
      expect(authRepo.invalidatePreviousTokens).toHaveBeenCalledWith("user_123");
      // (userId, sha256HexHash, expiresAt) — never the raw token.
      expect(authRepo.createResetToken).toHaveBeenCalledWith(
        "user_123",
        expect.stringMatching(/^[a-f0-9]{64}$/),
        expect.any(Date)
      );
      expect(mockedSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: email })
      );
    });

    it("silently succeeds when the email is unknown (no DB writes, no mail)", async () => {
      authRepo.findUserByEmail.mockResolvedValue(null);
      mockedSendMail.mockResolvedValue(undefined);

      await expect(
        authService.startPasswordReset("unknown@example.com")
      ).resolves.toBeUndefined();

      expect(authRepo.invalidatePreviousTokens).not.toHaveBeenCalled();
      expect(authRepo.createResetToken).not.toHaveBeenCalled();
      expect(mockedSendMail).not.toHaveBeenCalled();
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
