// src/models/Party.model.ts
import { IParty, PartyStatus } from "@interfaces/index";
import mongoose, { Document, Schema } from "mongoose";

export interface IPartyDocument extends Omit<IParty, "_id">, Document {}

const PartySchema = new Schema<IPartyDocument>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    status: {
      type: String,
      enum: ["active", "inactive"] as PartyStatus[],
      default: "active",
    },
    deleteRequest: {
      requestedBy: { type: Schema.Types.ObjectId, ref: "User" },
      requestedAt: { type: Date },
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
      },
    },
  },
  { timestamps: true },
);

// Index for fast search
PartySchema.index({ name: "text" });
PartySchema.index({ status: 1 });
PartySchema.index({ "deleteRequest.status": 1 });

export default mongoose.model<IPartyDocument>("Party", PartySchema);
