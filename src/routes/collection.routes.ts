// src/routes/collection.routes.ts
import {
  createCollection,
  deleteCollection,
  generateCollectionBill,
  getCollection,
  getCollectionDeleteRequests,
  getCollections,
  requestCollectionDelete,
  resolveCollectionDeleteRequest,
  updateCollection,
} from "@controllers/collection.controller";
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

// ✅ list — party নিজের কালেকশন দেখতে পারবে, staff সব দেখতে পারবে
router.get(
  "/",
  requireRole("admin", "moderator", "staff", "party"),
  enforceOwnPartyFilter,
  getCollections,
);

router.get(
  "/delete-requests",
  requireRole("admin"),
  getCollectionDeleteRequests,
);
router.get("/:id", requireRole("admin", "moderator", "staff"), getCollection);
router.get(
  "/:id/bill",
  requireRole("admin", "moderator", "staff"),
  generateCollectionBill,
);
router.post("/", requireRole("admin", "moderator", "staff"), createCollection);

router.put("/:id", requireRole("admin", "moderator"), updateCollection);
router.post(
  "/:id/request-delete",
  requireRole("admin", "moderator"),
  requestCollectionDelete,
);
router.patch(
  "/:id/delete-request",
  requireRole("admin"),
  resolveCollectionDeleteRequest,
);
router.delete("/:id", requireRole("admin"), deleteCollection);

export default router;
