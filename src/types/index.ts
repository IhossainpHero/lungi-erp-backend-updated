// src/types/index.ts

import { Types } from "mongoose";

// ─── Enums ────────────────────────────────────────────────
export type UserRole = "admin" | "moderator" | "staff" | "party";
export type PartyStatus = "active" | "inactive";
export type PaymentMethod = "cash" | "bkash" | "bank";
export type PaymentType = "partial" | "full" | "halkhat";
export type DamageStatus = "pending" | "approved" | "rejected";
export type DeleteRequestStatus = "pending" | "approved" | "rejected";
export type ServiceCategory = "marchraise" | "wash" | "tana";
export type ServiceLocation = "shahajadpur" | "dhaka";
export type ServiceVariant = "normal" | "vip";

// ─── Delete Request ───────────────────────────────────────
export interface IDeleteRequest {
  requestedBy?: Types.ObjectId;
  requestedAt?: Date;
  status?: DeleteRequestStatus;
}

// ─── Service ──────────────────────────────────────────────
export interface IService {
  _id: Types.ObjectId;
  serviceId: string;
  label: string;
  category: ServiceCategory;
  location: ServiceLocation;
  variant?: ServiceVariant;
  ratePerThan: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Party ────────────────────────────────────────────────
export interface IParty {
  _id: Types.ObjectId;
  name: string;
  phone?: string;
  address?: string;
  status: PartyStatus;
  deleteRequest?: IDeleteRequest;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Collection Line Item ─────────────────────────────────
export interface ILineItem {
  _id?: Types.ObjectId;
  serviceId: string;
  serviceName: string;
  quantity: number;
  foldingNumber?: number; // ভাঁজ সংখ্যা
  ratePerThan: number;
  amount: number;
}

// ─── Collection ───────────────────────────────────────────
export interface ICollection {
  _id: Types.ObjectId;
  partyId: Types.ObjectId;
  collectionDate: Date;
  hatName?: string;
  lineItems: ILineItem[];
  totalThan: number;
  totalFolding: number;
  totalAmount: number;
  notes?: string;
  createdBy: Types.ObjectId;

  // ✅ moderator → delete request, admin → approves (final delete)
  deleteRequested: boolean;
  deleteRequestedBy?: Types.ObjectId | null;
  deleteRequestedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

// ─── Payment ──────────────────────────────────────────────
export interface IPayment {
  _id: Types.ObjectId;
  partyId: Types.ObjectId;
  date: Date;
  amount: number;
  method: PaymentMethod;
  type: PaymentType;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Damage Claim (✅ FULL FIXED) ─────────────────────────
export interface IDamageClaim {
  _id: Types.ObjectId;
  partyId: Types.ObjectId;

  // nullable because schema default null
  collectionRef?: Types.ObjectId | null;

  claimDate: Date;

  damagedPieces: number;
  pricePerPiece: number;
  totalClaim: number;

  status: DamageStatus;

  // ✅ FIX: added (must match schema)
  deleteRequested: boolean;
  deleteRequestedBy?: Types.ObjectId | null;
  deleteRequestedAt?: Date | null;

  notes?: string;

  approvedBy?: Types.ObjectId | null;
  approvedAt?: Date | null;

  createdBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

// ─── User ─────────────────────────────────────────────────

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  phone: string;
  password: string;
  role: UserRole;
  partyId?: Types.ObjectId | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
// ─── Ledger ───────────────────────────────────────────────
export interface ILedgerEntry {
  date: Date;
  type: "collection" | "payment" | "damage";
  description: string;
  debit: number;
  credit: number;
  balance: number;
  refId: Types.ObjectId;
}

export interface ILedgerSummary {
  partyId: Types.ObjectId;
  partyName: string;
  totalCharge: number;
  totalPaid: number;
  totalDamageCredit: number;
  totalDue: number;
  entries: ILedgerEntry[];
}

// ─── API Response ─────────────────────────────────────────
export interface ApiResponseShape<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;
}
