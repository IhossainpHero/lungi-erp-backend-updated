// src/models/Collection.model.ts
import { ICollection, ILineItem } from "@interfaces/index";
import mongoose, { Document, Schema } from "mongoose";

export interface ICollectionDocument
  extends Omit<ICollection, "_id">, Document {}

const LineItemSchema = new Schema<ILineItem>(
  {
    serviceId: { type: String, required: true },
    serviceName: { type: String, required: true }, // snapshot
    quantity: { type: Number, required: true, min: 1 },
    foldingNumber: { type: Number, required: false, min: 0, default: 0 }, // ভাঁজ সংখ্যা
    ratePerThan: { type: Number, required: true, min: 0 }, // snapshot
    amount: { type: Number, required: true, min: 0 }, // auto
  },
  { _id: true },
);

const CollectionSchema = new Schema<ICollectionDocument>(
  {
    partyId: {
      type: Schema.Types.ObjectId,
      ref: "Party",
      required: true,
    },
    collectionDate: { type: Date, required: true },
     hatName: { type: String, trim: true, default: "" }, // ← নতুন যোগ

    lineItems: {
      type: [LineItemSchema],
      required: true,
      validate: {
        validator: (items: ILineItem[]) => items.length > 0,
        message: "কমপক্ষে একটি সার্ভিস লাইন দিতে হবে",
      },
    },
    totalThan: { type: Number, required: true, min: 0 },
    totalFolding: { type: Number, required: true, min: 0, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ✅ moderator রিকোয়েস্ট করবে, admin approve করে ফাইনাল ডিলিট করবে
    deleteRequested: { type: Boolean, default: false },
    deleteRequestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deleteRequestedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Auto-calculate totals before save
CollectionSchema.pre("save", function (next) {
  this.totalThan = this.lineItems.reduce((sum, item) => sum + item.quantity, 0);
  this.totalFolding = this.lineItems.reduce(
    (sum, item) => sum + (item.foldingNumber ?? 0),
    0,
  );
  this.totalAmount = this.lineItems.reduce((sum, item) => sum + item.amount, 0);
  next();
});

// Indexes
CollectionSchema.index({ partyId: 1, collectionDate: -1 });
CollectionSchema.index({ collectionDate: -1 });
CollectionSchema.index({ deleteRequested: 1 });

export default mongoose.model<ICollectionDocument>(
  "Collection",
  CollectionSchema,
);
