import express, { type Express } from "express";
import cors from "cors";
import request from "supertest";
import { describe, it, expect, beforeEach } from "vitest";


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
    const res = await request(app)
      .get("/api/ping")
      .set("Origin", DISALLOWED_ORIGIN);

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("denies preflight for disallowed origin by withholding ACAO", async () => {
    const res = await request(app)
      .options("/api/ping")
      .set("Origin", DISALLOWED_ORIGIN)
      .set("Access-Control-Request-Method", "GET");

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
