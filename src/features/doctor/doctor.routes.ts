import { Router } from "express";
import {
  requireAuth,
  requireRole,
} from "../../core/middleware/auth.middleware";
import { ROLES } from "../authentication/constants";

const router = Router();

router.get(
  "/doctors",
  requireAuth,
  requireRole(ROLES.OWNER_ROLE),
  (req, res) => {
    res.json({ message: `Welcome to your dashboard` });
  }
);

export default router;
