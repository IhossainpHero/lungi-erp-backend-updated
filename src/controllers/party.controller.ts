// src/controllers/party.controller.ts
import Collection from "@models/Collection.model";
import Party from "@models/Party.model";
import { getAllPartiesDue, getLedger } from "@services/ledger.service";
import { ApiError } from "@utils/ApiError";
import { ApiResponse } from "@utils/ApiResponse";
import { asyncHandler } from "@utils/asyncHandler";
import { createPartySchema, updatePartySchema } from "@validators/index";
import { Request, Response } from "express";
import { emitDataChanged } from "../socket";

// GET /api/parties — list with optional search
export const getParties = asyncHandler(async (req: Request, res: Response) => {
  const { search, status = "active" } = req.query;

  const filter: Record<string, any> = { status };
  if (search) filter.$text = { $search: String(search) };

  const parties = await Party.find(filter).sort({ name: 1 });
  res.json(new ApiResponse(200, parties, "সফল"));
});

// GET /api/parties/dues — all parties sorted by due
export const getPartiesDue = asyncHandler(
  async (_req: Request, res: Response) => {
    const data = await getAllPartiesDue();
    res.json(new ApiResponse(200, data, "সফল"));
  },
);

// GET /api/parties/:id
export const getParty = asyncHandler(async (req: Request, res: Response) => {
  if (
    req.user!.role === "party" &&
    String(req.user!.partyId) !== req.params.id
  ) {
    throw new ApiError(403, "শুধু নিজের তথ্য দেখতে পারবেন");
  }
  const party = await Party.findById(req.params.id).populate(
    "deleteRequest.requestedBy",
    "name",
  );
  if (!party) throw new ApiError(404, "পার্টি পাওয়া যায়নি");
  res.json(new ApiResponse(200, party, "সফল"));
});

export const getPartyLedger = asyncHandler(
  async (req: Request, res: Response) => {
    if (
      req.user!.role === "party" &&
      String(req.user!.partyId) !== req.params.id
    ) {
      throw new ApiError(403, "শুধু নিজের তথ্য দেখতে পারবেন");
    }
    const { date } = req.query; // ✅ নতুন
    const ledger = await getLedger(
      req.params.id,
      date ? String(date) : undefined, // ✅ নতুন
    );
    res.json(new ApiResponse(200, ledger, "সফল"));
  },
);

// POST /api/parties
export const createParty = asyncHandler(async (req: Request, res: Response) => {
  const data = createPartySchema.parse(req.body);
  const party = await Party.create(data);
  emitDataChanged("parties", "create");
  res.status(201).json(new ApiResponse(201, party, "পার্টি তৈরি হয়েছে"));
});

// PUT /api/parties/:id
export const updateParty = asyncHandler(async (req: Request, res: Response) => {
  const data = updatePartySchema.parse(req.body);
  const party = await Party.findByIdAndUpdate(req.params.id, data, {
    new: true,
    runValidators: true,
  });
  if (!party) throw new ApiError(404, "পার্টি পাওয়া যায়নি");
  emitDataChanged("parties", "create");
  res.json(new ApiResponse(200, party, "আপডেট সফল"));
});

// DELETE /api/parties/:id — admin only, soft delete
export const deleteParty = asyncHandler(async (req: Request, res: Response) => {
  const party = await Party.findByIdAndUpdate(
    req.params.id,
    { status: "inactive" },
    { new: true },
  );
  if (!party) throw new ApiError(404, "পার্টি পাওয়া যায়নি");

  // ✅ পার্টি নিষ্ক্রিয় হলে তার সব কালেকশন ডাটা মুছে যাবে
  await Collection.deleteMany({ partyId: party._id });
  emitDataChanged("parties", "delete");

  res.json(
    new ApiResponse(
      200,
      party,
      "পার্টি নিষ্ক্রিয় করা হয়েছে এবং সংশ্লিষ্ট কালেকশন ডাটা মুছে ফেলা হয়েছে",
    ),
  );
});

// POST /api/parties/:id/delete-request — moderator/admin করবে
export const requestDeleteParty = asyncHandler(
  async (req: Request, res: Response) => {
    const party = await Party.findById(req.params.id);
    if (!party) throw new ApiError(404, "পার্টি পাওয়া যায়নি");

    if (party.deleteRequest?.status === "pending") {
      throw new ApiError(400, "ইতিমধ্যে ডিলিট রিকোয়েস্ট পাঠানো হয়েছে");
    }

    party.deleteRequest = {
      requestedBy: req.user!._id,
      requestedAt: new Date(),
      status: "pending",
    };
    await party.save();
    emitDataChanged("parties", "update");

    res.json(new ApiResponse(200, party, "ডিলিট রিকোয়েস্ট পাঠানো হয়েছে"));
  },
);

// GET /api/parties/delete-requests — admin দেখবে
export const getDeleteRequests = asyncHandler(
  async (req: Request, res: Response) => {
    const parties = await Party.find({ "deleteRequest.status": "pending" })
      .populate("deleteRequest.requestedBy", "name")
      .sort({ "deleteRequest.requestedAt": -1 });

    res.json(new ApiResponse(200, parties, "সফল"));
  },
);

// PATCH /api/parties/:id/delete-request — admin approve/reject করবে
export const resolveDeleteRequest = asyncHandler(
  async (req: Request, res: Response) => {
    const { action } = req.body; // "approve" | "reject"

    if (!["approve", "reject"].includes(action)) {
      throw new ApiError(400, "action must be approve or reject");
    }

    const party = await Party.findById(req.params.id);
    if (!party) throw new ApiError(404, "পার্টি পাওয়া যায়নি");
    if (party.deleteRequest?.status !== "pending") {
      throw new ApiError(400, "কোনো pending রিকোয়েস্ট নেই");
    }

    if (action === "approve") {
      party.status = "inactive";
      party.deleteRequest!.status = "approved";

      // ✅ পার্টি নিষ্ক্রিয় হলে তার সব কালেকশন ডাটা মুছে যাবে
      await Collection.deleteMany({ partyId: party._id });
    } else {
      party.deleteRequest!.status = "rejected";
    }

    await party.save();
    emitDataChanged("parties", "update");

    const msg =
      action === "approve"
        ? "পার্টি নিষ্ক্রিয় করা হয়েছে"
        : "রিকোয়েস্ট প্রত্যাখ্যান করা হয়েছে";

    res.json(new ApiResponse(200, party, msg));
  },
);
