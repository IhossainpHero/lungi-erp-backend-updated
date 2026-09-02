// src/controllers/payment.controller.ts
import Party from "@models/Party.model";
import Payment from "@models/Payment.model";
import { ApiError } from "@utils/ApiError";
import { ApiResponse } from "@utils/ApiResponse";
import { asyncHandler } from "@utils/asyncHandler";
import { createPaymentSchema, updatePaymentSchema } from "@validators/index";
import { Request, Response } from "express";
import { emitDataChanged } from "../socket";

export const getPayments = asyncHandler(async (req: Request, res: Response) => {
  const { partyId, type, from, to } = req.query;
  const filter: Record<string, any> = {};
  if (partyId) filter.partyId = partyId;
  if (type) filter.type = type;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(String(from));
    if (to) filter.date.$lte = new Date(String(to));
  }

  const payments = await Payment.find(filter)
    .populate("partyId", "name hatName")
    .sort({ date: -1 });
  res.json(new ApiResponse(200, payments, "সফল"));
});

export const createPayment = asyncHandler(
  async (req: Request, res: Response) => {
    const data = createPaymentSchema.parse(req.body);

    const party = await Party.findById(data.partyId);
    if (!party) throw new ApiError(404, "পার্টি পাওয়া যায়নি");

    const payment = await Payment.create({
      ...data,
      date: new Date(String(data.date)),
      createdBy: req.user!._id,
    });
    emitDataChanged("payments", "create");

    res.status(201).json(new ApiResponse(201, payment, "পেমেন্ট সফল"));
  },
);

// PUT /api/payments/:id — admin/moderator, সরাসরি আপডেট (approval লাগবে না)
export const updatePayment = asyncHandler(
  async (req: Request, res: Response) => {
    const data = updatePaymentSchema.parse(req.body);

    const payment = await Payment.findById(req.params.id);
    if (!payment) throw new ApiError(404, "পেমেন্ট পাওয়া যায়নি");

    if (data.date) payment.date = new Date(String(data.date));
    if (data.amount !== undefined) payment.amount = data.amount;
    if (data.type) payment.type = data.type;
    if (data.method) payment.method = data.method;
    if (data.notes !== undefined) payment.notes = data.notes;

    await payment.save();
    emitDataChanged("payments", "update");

    res.json(new ApiResponse(200, payment, "পেমেন্ট আপডেট হয়েছে"));
  },
);

export const deletePayment = asyncHandler(
  async (req: Request, res: Response) => {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) throw new ApiError(404, "পেমেন্ট পাওয়া যায়নি");
    emitDataChanged("payments", "delete");
    res.json(new ApiResponse(200, null, "পেমেন্ট মুছে ফেলা হয়েছে"));
  },
);
