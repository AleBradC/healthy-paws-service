import { Request, Response, NextFunction } from "express";
import passport from "passport";

// The main authentication middleware
export const requireAuth = passport.authenticate("jwt", { session: false });

// The role-based authorization middleware
export const requireRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userRoles = Array.isArray(roles) ? roles : [roles];
    const user = req.user as { role: string };

    if (!userRoles.includes(user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
};
