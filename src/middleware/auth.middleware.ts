// src/middleware/auth.middleware.ts
import { UserRole } from "@interfaces/index";
import User from "@models/User.model";
import { ApiError } from "@utils/ApiError";
import { asyncHandler } from "@utils/asyncHandler";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

interface JwtPayload {
  id: string;
  role: UserRole;
}

// ── Protect: verify JWT ──────────────────────────────────────────
export const protect = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new ApiError(401, "Authorization token প্রয়োজন");
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new ApiError(500, "JWT secret not configured");

    const decoded = jwt.verify(token, secret) as JwtPayload;
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      throw new ApiError(401, "ইউজার পাওয়া যায়নি");
    }

    req.user = user;
    next();
  },
);

// ── RequireRole: check user role ─────────────────────────────────
export const requireRole = (...roles: UserRole[]) =>
  asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, "এই কাজের অনুমতি নেই");
    }
    next();
  });
export const restrictToOwnParty = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    if (req.user?.role === "party") {
      if (String(req.user.partyId) !== req.params.id) {
        throw new ApiError(403, "শুধুমাত্র নিজের পার্টির তথ্য দেখা যাবে");
      }
    }
    next();
  },
);

export const enforceOwnPartyFilter = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    if (req.user?.role === "party") {
      req.query.partyId = String(req.user.partyId);
    }
    next();
  },
);

export const requireActive = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user?.isActive) {
      throw new ApiError(
        403,
        "অ্যাডমিন অনুমোদন ছাড়া আপনি অ্যাক্সেস করতে পারবেন না",
      );
    }
    next();
  },
);
