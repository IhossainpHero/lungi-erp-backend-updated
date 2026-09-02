// src/routes/party.routes.ts
import {
  createParty,
  deleteParty,
  getDeleteRequests,
  getParties,
  getPartiesDue,
  getParty,
  getPartyLedger,
  requestDeleteParty,
  resolveDeleteRequest,
  updateParty,
} from "@controllers/party.controller";
import {
  protect,
  requireActive,
  requireRole,
  restrictToOwnParty,
} from "@middleware/auth.middleware";
import { Router } from "express";

const router = Router();

router.use(protect); // all routes need auth
router.use(requireActive); // admin approval ছাড়া অ্যাক্সেস নেই

// ── স্টাফ/মডারেটর/অ্যাডমিন-only ─────────────────────────────
router.get("/", requireRole("admin", "moderator", "staff"), getParties);
router.get("/dues", requireRole("admin", "moderator", "staff"), getPartiesDue);
router.get("/delete-requests", requireRole("admin"), getDeleteRequests);
router.post("/", requireRole("admin", "moderator", "staff"), createParty);

// ── staff/moderator/admin + সেই পার্টি নিজে (শুধু নিজের ডাটা) ──
router.get(
  "/:id",
  requireRole("admin", "moderator", "staff", "party"),
  restrictToOwnParty,
  getParty,
);
router.get(
  "/:id/ledger",
  requireRole("admin", "moderator", "staff", "party"),
  restrictToOwnParty,
  getPartyLedger,
);

// moderator ডিলিট রিকোয়েস্ট পাঠাবে, admin approve/reject করবে
router.post(
  "/:id/delete-request",
  requireRole("admin", "moderator"),
  requestDeleteParty,
);

// moderator সরাসরি আপডেট করতে পারবে — admin approval লাগবে না
router.put("/:id", requireRole("admin", "moderator"), updateParty);

router.patch("/:id/delete-request", requireRole("admin"), resolveDeleteRequest);
router.delete("/:id", requireRole("admin"), deleteParty);

export default router;
