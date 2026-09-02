// src/models/Payment.model.ts
import { IPayment, PaymentMethod, PaymentType } from "@interfaces/index";
import mongoose, { Document, Schema } from "mongoose";

export interface IPaymentDocument extends Omit<IPayment, "_id">, Document {}

const PaymentSchema = new Schema<IPaymentDocument>(
  {
    partyId: {
      type: Schema.Types.ObjectId,
      ref: "Party",
      required: true,
    },
    date: { type: Date, required: true },
    amount: { type: Number, required: true, min: 1 },
    method: {
      type: String,
      enum: ["cash", "bkash", "bank"] as PaymentMethod[],
      required: true,
    },
    type: {
      type: String,
      enum: ["partial", "full", "halkhat"] as PaymentType[],
      required: true,
    },
    notes: { type: String, trim: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

PaymentSchema.index({ partyId: 1, date: -1 });
PaymentSchema.index({ date: -1 });
PaymentSchema.index({ type: 1 });

export default mongoose.model<IPaymentDocument>("Payment", PaymentSchema);
