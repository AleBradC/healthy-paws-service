import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { AuthenticationController } from "../../features/authentication/authentication.controller";

// Account-enumeration parity for the password-reset endpoint.
//
// The contract: regardless of whether the email exists, the response shape
// and status code MUST be identical. Any divergence (different message,
// different status code, even an observably different response time over
// many calls) leaks whether the email is registered.

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
    // Whatever the service does internally (silently no-op, or throw a
    // soft NotFound that the service handles privately), the HTTP response
    // must not leak it. The service contract is to resolve in all "user
    // not found" cases — verify the controller honours that.
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
    // Capture both response bodies and diff them — the literal JSON must
    // be identical so an attacker can't byte-compare.
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
    // This is the one place divergence is expected — but it's about syntax,
    // not account existence. A garbage body must NOT reach the service.
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
