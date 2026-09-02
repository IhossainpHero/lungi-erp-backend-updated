// src/controllers/damage.controller.ts

import DamageClaim from "@models/DamageClaim.model";
import Party from "@models/Party.model";
import { ApiError } from "@utils/ApiError";
import { ApiResponse } from "@utils/ApiResponse";
import { asyncHandler } from "@utils/asyncHandler";
import {
  createDamageSchema,
  updateDamageSchema,
  updateDamageStatusSchema,
} from "@validators/index";
import { Request, Response } from "express";
import { emitDataChanged } from "../socket";

// 📌 GET
// 📌 GET
export const getDamageClaims = asyncHandler(
  async (req: Request, res: Response) => {
    const { partyId, status, from, to } = req.query;
    const filter: Record<string, any> = {};

    if (partyId) filter.partyId = partyId;
    if (status) filter.status = status;
    if (from || to) {
      filter.claimDate = {};
      if (from) filter.claimDate.$gte = new Date(String(from));
      if (to) filter.claimDate.$lte = new Date(String(to));
    }

    const claims = await DamageClaim.find(filter)
      .populate("partyId", "name")
      .populate("approvedBy", "name")
      .populate("deleteRequestedBy", "name")
      .sort({ claimDate: -1 });

    res.json(new ApiResponse(200, claims, "সফল"));
  },
);

// 📌 CREATE
export const createDamageClaim = asyncHandler(
  async (req: Request, res: Response) => {
    const data = createDamageSchema.parse(req.body);

    const party = await Party.findById(data.partyId);
    if (!party) throw new ApiError(404, "পার্টি পাওয়া যায়নি");

    const claim = await DamageClaim.create({
      ...data,
      claimDate: new Date(String(data.claimDate)),
      totalClaim: 0,
      status: "pending",
      createdBy: req.user!._id,
    });
    emitDataChanged("damage", "create");
    res
      .status(201)
      .json(new ApiResponse(201, claim, "ড্যামেজ ক্লেইম দাখিল হয়েছে"));
  },
);

// 📌 UPDATE
export const updateDamage = asyncHandler(
  async (req: Request, res: Response) => {
    const data = updateDamageSchema.parse(req.body);

    const damage = await DamageClaim.findById(req.params.id);
    if (!damage) throw new ApiError(404, "ড্যামেজ ক্লেইম পাওয়া যায়নি");

    damage.claimDate = new Date(data.claimDate);
    damage.damagedPieces = data.damagedPieces;
    damage.pricePerPiece = data.pricePerPiece;
    damage.notes = data.notes ?? "";

    await damage.save();
    emitDataChanged("damage", "update");

    res.json(new ApiResponse(200, damage, "ড্যামেজ ক্লেইম আপডেট সফল"));
  },
);

// 📌 STATUS UPDATE (ADMIN)
export const updateDamageStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { status } = updateDamageStatusSchema.parse(req.body);

    const updateData: Record<string, any> = { status };

    if (status === "approved") {
      updateData.approvedBy = req.user!._id;
      updateData.approvedAt = new Date();
    }

    const claim = await DamageClaim.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true },
    );

    if (!claim) throw new ApiError(404, "ক্লেইম পাওয়া যায়নি");
    emitDataChanged("damage", "update");

    const msg =
      status === "approved"
        ? "ড্যামেজ ক্লেইম অনুমোদিত — বকেয়া থেকে বাদ যাবে"
        : "ড্যামেজ ক্লেইম বাতিল করা হয়েছে";

    res.json(new ApiResponse(200, claim, msg));
  },
);

// 📌 DELETE REQUEST (MODERATOR/ADMIN)
export const requestDamageDelete = asyncHandler(
  async (req: Request, res: Response) => {
    const damage = await DamageClaim.findById(req.params.id);

    if (!damage) throw new ApiError(404, "পাওয়া যায়নি");
    if (damage.deleteRequested) {
      throw new ApiError(400, "ইতিমধ্যে ডিলিট রিকোয়েস্ট পাঠানো হয়েছে");
    }

    damage.deleteRequested = true;
    damage.deleteRequestedBy = req.user!._id;
    damage.deleteRequestedAt = new Date();

    await damage.save();
    emitDataChanged("damage", "update");

    res.json(
      new ApiResponse(
        200,
        damage,
        "ডিলিটের অনুরোধ পাঠানো হয়েছে — অ্যাডমিন অনুমোদনের অপেক্ষায়",
      ),
    );
  },
);

// 📌 REJECT DELETE REQUEST (ADMIN)
export const rejectDamageDeleteRequest = asyncHandler(
  async (req: Request, res: Response) => {
    const damage = await DamageClaim.findById(req.params.id);
    if (!damage) throw new ApiError(404, "পাওয়া যায়নি");
    if (!damage.deleteRequested) {
      throw new ApiError(400, "কোনো pending রিকোয়েস্ট নেই");
    }

    damage.deleteRequested = false;
    damage.deleteRequestedBy = null;
    damage.deleteRequestedAt = null;
    await damage.save();
    emitDataChanged("damage", "update");

    res.json(
      new ApiResponse(200, damage, "ডিলিট রিকোয়েস্ট প্রত্যাখ্যান করা হয়েছে"),
    );
  },
);

// 📌 FINAL DELETE (ADMIN)
export const deleteDamageClaim = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, "ID missing");
    }

    const damage = await DamageClaim.findByIdAndDelete(id);

    if (!damage) {
      throw new ApiError(404, "ড্যামেজ ক্লেইম পাওয়া যায়নি");
    }

    emitDataChanged("damage", "delete");

    res.json(new ApiResponse(200, null, "ড্যামেজ ক্লেইম মুছে ফেলা হয়েছে"));
  },
);
