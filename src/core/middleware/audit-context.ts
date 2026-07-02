import { Request, Response, NextFunction } from "express";

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
  next: NextFunction,
): void => {
  const userAgent = req.get("user-agent") ?? null;
  req.auditContext = {
    ip: req.ip ?? null,
    userAgent: userAgent ? userAgent.slice(0, 1024) : null,
  };
  next();
};
