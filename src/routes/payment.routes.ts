// src/routes/payment.routes.ts
import {
  createPayment,
  deletePayment,
  getPayments,
  updatePayment,
} from "@controllers/payment.controller";
import {
  enforceOwnPartyFilter,
  protect,
  requireActive,
  requireRole,
} from "@middleware/auth.middleware";
import { Router } from "express";

const router = Router();
router.use(protect);
router.use(requireActive);

router.get(
  "/",
  requireRole("admin", "moderator", "staff", "party"),
  enforceOwnPartyFilter,
  getPayments,
);
router.post("/", requireRole("admin", "moderator", "staff"), createPayment);

router.put("/:id", requireRole("admin", "moderator"), updatePayment);
router.delete("/:id", requireRole("admin"), deletePayment);

export default router;
