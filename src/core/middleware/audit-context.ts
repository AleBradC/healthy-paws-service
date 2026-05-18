import { Request, Response, NextFunction } from "express";

// Per-request audit context. We attach it to `req` so any downstream handler
// (REST controller, Apollo plugin, service called from either) can read the
// originating IP and user-agent without re-extracting them from headers each
// time.
//
// IP detection relies on `app.set("trust proxy", N)` in app.ts. Without that,
// `req.ip` is the address of the immediate hop (nginx) and every event would
// look like it came from the same place. See app.ts for the TRUST_PROXY env
// var that tunes the hop count for dev vs production.
export interface AuditContext {
  ip: string | null;
  userAgent: string | null;
}

declare global {
  namespace Express {
    interface Request {
      auditContext?: AuditContext;
    }
  }
}

export const auditContextMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const userAgent = req.get("user-agent") ?? null;
  req.auditContext = {
    ip: req.ip ?? null,
    // Cap user-agent length so a malicious 1MB UA header can't bloat the
    // audit table. 1024 is generous; real-world UAs top out around 300.
    userAgent: userAgent ? userAgent.slice(0, 1024) : null,
  };
  next();
};
