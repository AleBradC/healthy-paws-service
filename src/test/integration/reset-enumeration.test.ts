import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { AuthenticationController } from "../../features/authentication/authentication.controller";


function makeRes() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  res.clearCookie = vi.fn().mockReturnValue(res);
  return res;
}

describe("Password reset enumeration parity", () => {
  let startPasswordReset: ReturnType<typeof vi.fn>;
  let controller: AuthenticationController;

  beforeEach(() => {
    startPasswordReset = vi.fn();
    controller = new AuthenticationController({
      startPasswordReset,
    } as never);
  });

  it("returns an identical success response for a registered email", async () => {
    startPasswordReset.mockResolvedValue(undefined);
    const res = makeRes();
    await controller.startPasswordReset(
      { body: { email: "exists@example.com" } } as Request,
      res,
      vi.fn() as unknown as NextFunction
    );

    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: "success" })
    );
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns the same success response for an unknown email (no enumeration)", async () => {
    startPasswordReset.mockResolvedValue(undefined);
    const res = makeRes();
    await controller.startPasswordReset(
      { body: { email: "does-not-exist@example.com" } } as Request,
      res,
      vi.fn() as unknown as NextFunction
    );

    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: "success" })
    );
    expect(res.status).not.toHaveBeenCalled();
  });

  it("emits the same JSON body for both known and unknown emails", async () => {
    startPasswordReset.mockResolvedValue(undefined);

    const knownRes = makeRes();
    await controller.startPasswordReset(
      { body: { email: "exists@example.com" } } as Request,
      knownRes,
      vi.fn() as unknown as NextFunction
    );

    const unknownRes = makeRes();
    await controller.startPasswordReset(
      { body: { email: "does-not-exist@example.com" } } as Request,
      unknownRes,
      vi.fn() as unknown as NextFunction
    );

    const knownBody = (knownRes.json as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    const unknownBody = (unknownRes.json as ReturnType<typeof vi.fn>).mock
      .calls[0][0];

    expect(unknownBody).toEqual(knownBody);
  });

  it("rejects malformed input with a 400 (validation error, distinct from enumeration)", async () => {
    const res = makeRes();
    const next = vi.fn();
    await controller.startPasswordReset(
      { body: { email: "not-an-email" } } as Request,
      res,
      next as unknown as NextFunction
    );

    expect(startPasswordReset).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeDefined();
    expect(err.statusCode ?? err.status).toBe(400);
  });
});
