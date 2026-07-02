import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuditService } from "./audit.service";
import { AuditRepository } from "./audit.repository";
import { AuditAction } from "./audit.types";

describe("AuditService", () => {
  let mockRepo: { insert: ReturnType<typeof vi.fn> };
  let service: AuditService;

  beforeEach(() => {
    mockRepo = { insert: vi.fn().mockResolvedValue(undefined) };
    service = new AuditService(mockRepo as unknown as AuditRepository);
  });

  it("forwards the event to the repository", async () => {
    service.record({
      action: AuditAction.LoginSuccess,
      outcome: "success",
      actorUserId: "user-1",
      actorRole: "owner",
      ip: "127.0.0.1",
      userAgent: "vitest",
    });

    await new Promise((resolve) => setImmediate(resolve));

    expect(mockRepo.insert).toHaveBeenCalledTimes(1);
    expect(mockRepo.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.LoginSuccess,
        outcome: "success",
        actorUserId: "user-1",
      })
    );
  });

  it("never throws when the repository write fails", async () => {
    const dbErr = new Error("connection refused");
    mockRepo.insert.mockRejectedValueOnce(dbErr);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() =>
      service.record({
        action: AuditAction.LoginFailure,
        outcome: "failure",
        ip: "127.0.0.1",
      })
    ).not.toThrow();

    await new Promise((resolve) => setImmediate(resolve));

    expect(consoleSpy).toHaveBeenCalledWith(
      "Audit write failed:",
      expect.objectContaining({ action: AuditAction.LoginFailure })
    );
    consoleSpy.mockRestore();
  });
});
