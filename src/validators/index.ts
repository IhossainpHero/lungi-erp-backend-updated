// src/validators/party.validator.ts
import { z } from "zod";

// src/validators/auth.validator.ts
export const registerSchema = z.object({
  name: z.string().min(2, "নাম কমপক্ষে ২ অক্ষর দিন").trim(),
  phone: z
    .string()
    .regex(/^01[3-9]\d{8}$/, "সঠিক বাংলাদেশি ফোন নম্বর দিন (01XXXXXXXXX)")
    .trim(),
  password: z.string().min(6, "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে"),
});

export const loginSchema = z.object({
  phone: z
    .string()
    .regex(/^01[3-9]\d{8}$/, "সঠিক ফোন নম্বর দিন")
    .trim(),
  password: z.string().min(1, "পাসওয়ার্ড দিন"),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["admin", "moderator", "staff", "party"]),
});

export const createPartySchema = z.object({
  name: z.string().min(2, "নাম কমপক্ষে ২ অক্ষর").trim(),
  phone: z.string().optional(),

  address: z.string().optional(),
});

export const updatePartySchema = createPartySchema.partial().extend({
  status: z.enum(["active", "inactive"]).optional(),
});

// src/validators/collection.validator.ts

export const lineItemSchema = z.object({
  serviceId: z.string().min(1, "সার্ভিস বেছে নিন"),
  quantity: z.number().min(1, "থান কমপক্ষে ১ হতে হবে"),
  foldingNumber: z
    .number()
    .min(0, "ভাঁজ সংখ্যা ০ বা তার বেশি হতে হবে")
    .optional(),
  rate: z.number().min(0).optional(), // ✅ frontend এর দেওয়া rate
});

export const createCollectionSchema = z.object({
  partyId: z.string().min(1, "পার্টি বেছে নিন"),
  collectionDate: z.string().or(z.date()),

  lineItems: z
    .array(lineItemSchema)
    .min(1, "কমপক্ষে একটি সার্ভিস লাইন দিতে হবে"),
  notes: z.string().optional(),
});

// src/validators/payment.validator.ts
export const createPaymentSchema = z.object({
  partyId: z.string().min(1, "পার্টি বেছে নিন"),
  date: z.string().or(z.date()),
  amount: z.number().min(1, "পরিমাণ ০ এর বেশি হতে হবে"),
  method: z.enum(["cash", "bkash", "bank"]),
  type: z.enum(["partial", "full", "halkhat"]),
  notes: z.string().optional(),
});

export const updatePaymentSchema = z.object({
  date: z.string().or(z.date()).optional(),
  amount: z.number().min(1, "পরিমাণ ০ এর বেশি হতে হবে").optional(),
  method: z.enum(["cash", "bkash", "bank"]).optional(),
  type: z.enum(["partial", "full", "halkhat"]).optional(),
  notes: z.string().optional(),
});
// src/validators/damage.validator.ts
export const createDamageSchema = z.object({
  partyId: z.string().min(1, "পার্টি বেছে নিন"),
  collectionRef: z.string().optional(),
  claimDate: z.string().or(z.date()),
  damagedPieces: z.number().min(1, "পিস সংখ্যা ১ এর বেশি হতে হবে"),
  pricePerPiece: z.number().min(0, "মূল্য ০ এর বেশি হতে হবে"),
  notes: z.string().optional(),
});

export const updateDamageStatusSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

export const updateDamageSchema = z.object({
  claimDate: z.string().min(1, "তারিখ দিন"),
  damagedPieces: z.number().min(1, "কমপক্ষে ১ পিস হতে হবে"),
  pricePerPiece: z.number().min(0, "মূল্য ০ এর কম হতে পারবে না"),
  notes: z.string().optional(),
});
