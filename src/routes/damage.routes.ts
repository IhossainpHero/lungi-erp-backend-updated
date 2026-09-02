// src/routes/damage.routes.ts
import {
  createDamageClaim,
  deleteDamageClaim,
  getDamageClaims,
  rejectDamageDeleteRequest,
  requestDamageDelete,
  updateDamage,
  updateDamageStatus,
} from "@controllers/damage.controller";
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
  getDamageClaims,
);
router.post("/", requireRole("admin", "moderator", "staff"), createDamageClaim);

router.put("/:id", requireRole("admin", "moderator"), updateDamage);
router.patch("/:id/status", requireRole("admin"), updateDamageStatus);
router.post(
  "/:id/request-delete",
  requireRole("admin", "moderator"),
  requestDamageDelete,
);
router.patch(
  "/:id/delete-request",
  requireRole("admin"),
  rejectDamageDeleteRequest,
);
router.delete("/:id", requireRole("admin"), deleteDamageClaim);

export default router;
