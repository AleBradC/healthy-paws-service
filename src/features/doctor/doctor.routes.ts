import { Router } from "express";
import {
  requireAuth,
  requireRole,
} from "../../core/middleware/auth.middleware";

const router = Router();

router.get("/doctors", requireAuth, requireRole("owner"), (req, res) => {
  res.json({ message: `Welcome to your dashboard` });
});

export default router;
