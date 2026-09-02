// src/models/DamageClaim.model.ts

import { DamageStatus, IDamageClaim } from "@interfaces/index";
import mongoose, { Document, Schema } from "mongoose";

// ✅ FIX 1: Omit remove (important)
export interface IDamageClaimDocument extends IDamageClaim, Document {}

const DamageClaimSchema = new Schema<IDamageClaimDocument>(
  {
    partyId: {
      type: Schema.Types.ObjectId,
      ref: "Party",
      required: true,
    },
    collectionRef: {
      type: Schema.Types.ObjectId,
      ref: "Collection",
      default: null,
    },
    claimDate: { type: Date, required: true },

    damagedPieces: { type: Number, required: true, min: 1 },
    pricePerPiece: { type: Number, required: true, min: 0 },

    // ✅ FIX 2: required remove, default add (better)
    totalClaim: { type: Number, default: 0, min: 0 },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"] as DamageStatus[],
      default: "pending",
    },

    // ✅ FIX 3: must exist in interface
    deleteRequested: { type: Boolean, default: false },
    deleteRequestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deleteRequestedAt: { type: Date, default: null },

    notes: { type: String, trim: true },

    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: { type: Date, default: null },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// ✅ FIX 4: Proper typing for `this` (MOST IMPORTANT)
DamageClaimSchema.pre<IDamageClaimDocument>("save", function (next) {
  this.totalClaim = this.damagedPieces * this.pricePerPiece;
  next();
});

// Indexes
DamageClaimSchema.index({ partyId: 1, claimDate: -1 });
DamageClaimSchema.index({ status: 1 });

export default mongoose.model<IDamageClaimDocument>(
  "DamageClaim",
  DamageClaimSchema,
);
