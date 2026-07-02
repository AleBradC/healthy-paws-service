import express, { type Express } from "express";
import request from "supertest";
import { describe, it, expect, beforeEach } from "vitest";
import rateLimit from "express-rate-limit";


describe("Rate limiting", () => {
  it("returns 429 after exceeding the request budget", async () => {
    const limiter = rateLimit({
      windowMs: 60_000,
      max: 3,
      standardHeaders: true,
      legacyHeaders: false,
      message: { status: "error", message: "Too many requests." },
    });

    const app: Express = express();
    app.use("/test", limiter, (_req, res) => res.json({ ok: true }));

    for (let i = 0; i < 3; i++) {
      const res = await request(app).get("/test");
      expect(res.status).toBe(200);
    }

    const blocked = await request(app).get("/test");
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({
      status: "error",
      message: "Too many requests.",
    });
  });

  it("emits the standard RateLimit-* headers", async () => {
    const limiter = rateLimit({
      windowMs: 60_000,
      max: 5,
      standardHeaders: true,
      legacyHeaders: false,
    });

    const app: Express = express();
    app.use("/h", limiter, (_req, res) => res.json({ ok: true }));

    const res = await request(app).get("/h");

    const headerNames = Object.keys(res.headers);
    expect(headerNames.some((h) => h.startsWith("ratelimit-"))).toBe(true);
  });
});
