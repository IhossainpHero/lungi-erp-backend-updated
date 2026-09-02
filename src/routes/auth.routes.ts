// src/routes/auth.routes.ts
import {
  approveUser,
  getMe,
  listUsers,
  login,
  register,
  updateUserRole,
} from "@controllers/auth.controller";
import { protect, requireRole } from "@middleware/auth.middleware";
import { Router } from "express";

const router = Router();

// Public
router.post("/register", register);
router.post("/login", login);

// Authenticated
router.get("/me", protect, getMe);

// Admin only — Settings পেজ থেকে ইউজারের রোল ম্যানেজ করার জন্য
router.get("/users", protect, requireRole("admin"), listUsers);
router.patch("/users/:id/role", protect, requireRole("admin"), updateUserRole);

router.patch("/users/:id/approve", protect, requireRole("admin"), approveUser);

export default router;
