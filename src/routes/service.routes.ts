// src/routes/service.routes.ts
import {
  protect,
  requireActive,
  requireRole,
} from "@middleware/auth.middleware";
import Service from "@models/Service.model";
import { ApiError } from "@utils/ApiError";
import { ApiResponse } from "@utils/ApiResponse";
import { asyncHandler } from "@utils/asyncHandler";
import { Router } from "express";

const router = Router();
router.use(protect);
router.use(requireActive);
router.use(requireRole("admin", "moderator", "staff"));

// GET all active services
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const services = await Service.find({ isActive: true }).sort({
      category: 1,
      location: 1,
    });
    res.json(new ApiResponse(200, services, "সফল"));
  }),
);

// PUT update rate — admin only
router.put(
  "/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { ratePerThan } = req.body;
    if (typeof ratePerThan !== "number" || ratePerThan < 0) {
      throw new ApiError(400, "সঠিক রেট দিন");
    }
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { ratePerThan },
      { new: true },
    );
    if (!service) throw new ApiError(404, "সার্ভিস পাওয়া যায়নি");
    res.json(new ApiResponse(200, service, "রেট আপডেট সফল"));
  }),
);

export default router;
