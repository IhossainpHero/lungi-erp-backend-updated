// src/models/Service.model.ts
import {
  IService,
  ServiceCategory,
  ServiceLocation,
  ServiceVariant,
} from "@interfaces/index";
import mongoose, { Document, Schema } from "mongoose";

export interface IServiceDocument extends Omit<IService, "_id">, Document {}

const ServiceSchema = new Schema<IServiceDocument>(
  {
    serviceId: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    category: {
      type: String,
      enum: ["marchraise", "wash", "tana"] as ServiceCategory[],
      required: true,
    },
    location: {
      type: String,
      enum: ["shahajadpur", "dhaka"] as ServiceLocation[],
      required: true,
    },
    variant: {
      type: String,
      enum: ["normal", "vip", null] as (ServiceVariant | null)[],
      default: null,
    },
    ratePerThan: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model<IServiceDocument>("Service", ServiceSchema);
