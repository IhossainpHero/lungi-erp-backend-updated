import Party from "@models/Party.model";
import User from "@models/User.model";
import { ApiError } from "@utils/ApiError";
import { ApiResponse } from "@utils/ApiResponse";
import { asyncHandler } from "@utils/asyncHandler";
import {
  loginSchema,
  registerSchema,
  updateUserRoleSchema,
} from "@validators/index";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { emitDataChanged } from "../socket";

const generateToken = (
  id: string,
  role: string,
  partyId?: string | null,
): string => {
  return jwt.sign(
    { id, role, partyId: partyId ?? null },
    process.env.JWT_SECRET!,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    } as jwt.SignOptions,
  );
};

// POST /api/auth/register — phone + password রেজিস্ট্রেশন
export const register = asyncHandler(async (req: Request, res: Response) => {
  const data = registerSchema.parse(req.body);

  const existing = await User.findOne({ phone: data.phone });
  if (existing)
    throw new ApiError(409, "এই নম্বর দিয়ে ইতিমধ্যে অ্যাকাউন্ট আছে");

  // ✅ এই ফোন নম্বরে কোনো পার্টি আগে থেকে রেজিস্টার করা আছে কিনা চেক
  const matchedParty = await Party.findOne({ phone: data.phone });

  const user = await User.create({
    name: data.name,
    phone: data.phone,
    password: data.password,
    role: matchedParty ? "party" : "staff",
    partyId: matchedParty ? matchedParty._id : null,
    isActive: matchedParty ? true : false, // ✅ পার্টি হলে instant access, নাহলে admin approval লাগবে
  });

  const token = generateToken(
    String(user._id),
    user.role,
    user.partyId ? String(user.partyId) : null,
  );
  const { password: _pw, ...userData } = user.toObject();

  const message = matchedParty
    ? "রেজিস্ট্রেশন সফল — আপনার পার্টি অ্যাকাউন্ট চিহ্নিত হয়েছে"
    : "রেজিস্ট্রেশন সফল";

  res
    .status(201)
    .json(new ApiResponse(201, { token, user: userData }, message));
});

// POST /api/auth/login — phone + password
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { phone, password } = loginSchema.parse(req.body);

  const user = await User.findOne({ phone }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "ফোন নম্বর বা পাসওয়ার্ড ভুল");
  }
  if (!user.isActive) throw new ApiError(403, "অ্যাকাউন্ট নিষ্ক্রিয়");

  const token = generateToken(
    String(user._id),
    user.role,
    user.partyId ? String(user.partyId) : null,
  );
  const { password: _pw, ...userData } = user.toObject();

  res.json(new ApiResponse(200, { token, user: userData }, "লগইন সফল"));
});

// বাকি getMe, listUsers, updateUserRole অপরিবর্তিত

// GET /api/auth/me
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  res.json(new ApiResponse(200, req.user, "সফল"));
});

// GET /api/auth/users — admin only, ব্যবহারকারী তালিকা (Settings পেজের জন্য)
export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(new ApiResponse(200, users, "সফল"));
});

// PATCH /api/auth/users/:id/role — admin only, moderator/admin/staff অ্যাক্সেস দেওয়া
export const updateUserRole = asyncHandler(
  async (req: Request, res: Response) => {
    const { role } = updateUserRoleSchema.parse(req.body);

    if (String(req.user!._id) === req.params.id) {
      throw new ApiError(400, "নিজের রোল নিজে পরিবর্তন করা যাবে না");
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true },
    );
    if (!user) throw new ApiError(404, "ইউজার পাওয়া যায়নি");
    emitDataChanged("users", "update");

    res.json(new ApiResponse(200, user, "রোল আপডেট হয়েছে"));
  },
);

export const approveUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: true },
    { new: true },
  );
  if (!user) throw new ApiError(404, "ইউজার পাওয়া যায়নি");
  res.json(new ApiResponse(200, user, "ইউজার অনুমোদিত হয়েছে"));
});
