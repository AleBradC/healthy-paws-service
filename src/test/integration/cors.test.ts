import express, { type Express } from "express";
import cors from "cors";
import request from "supertest";
import { describe, it, expect, beforeEach } from "vitest";

// Mirrors the production CORS configuration in src/app.ts. The CORS middleware
// must reject browsers from origins outside the allowlist; if this regresses,
// any third-party site could make authenticated requests against the API on
// behalf of a logged-in user.

const ALLOWED_ORIGIN = "https://app.example.com";
const DISALLOWED_ORIGIN = "https://evil.example.com";

function buildApp(): Express {
  const app = express();
  app.use(
    cors({
      origin: [ALLOWED_ORIGIN],
      credentials: true,
    })
  );
  app.get("/api/ping", (_req, res) => res.json({ ok: true }));
  return app;
}

describe("CORS allowlist", () => {
  let app: Express;

  beforeEach(() => {
    app = buildApp();
  });

  it("echoes the Access-Control-Allow-Origin header for allowed origins", async () => {
    const res = await request(app)
      .get("/api/ping")
      .set("Origin", ALLOWED_ORIGIN);

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe(ALLOWED_ORIGIN);
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("does not return an Access-Control-Allow-Origin header for disallowed origins", async () => {
    // cors() lets the request through at the Express layer but withholds the
    // ACAO header, which is what makes the browser block the response. This
    // is the spec-correct behaviour — assert on the absence of the header.
    const res = await request(app)
      .get("/api/ping")
      .set("Origin", DISALLOWED_ORIGIN);

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("denies preflight for disallowed origin by withholding ACAO", async () => {
    // The `cors` middleware still emits a 204 with Access-Control-Allow-*
    // metadata on the preflight, but it omits Access-Control-Allow-Origin
    // when the request Origin is not in the allowlist. Without ACAO the
    // browser refuses the upgrade and never sends the real request — that
    // is the security property we're asserting.
    const res = await request(app)
      .options("/api/ping")
      .set("Origin", DISALLOWED_ORIGIN)
      .set("Access-Control-Request-Method", "GET");

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
