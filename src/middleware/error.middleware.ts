// src/middleware/error.middleware.ts
import { ApiError } from "@utils/ApiError";
import { NextFunction, Request, Response } from "express";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
    return;
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    res.status(400).json({
      success: false,
      message: "Validation error",
      errors: [err.message],
    });
    return;
  }

  // Mongoose duplicate key error
  if (err.name === "MongoServerError" && (err as any).code === 11000) {
    res.status(409).json({
      success: false,
      message: "এই তথ্য আগে থেকেই আছে",
      errors: [],
    });
    return;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    res
      .status(401)
      .json({ success: false, message: "Invalid token", errors: [] });
    return;
  }
  if (err.name === "TokenExpiredError") {
    res
      .status(401)
      .json({ success: false, message: "Token expired", errors: [] });
    return;
  }

  // Default 500
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    errors: [],
  });
};

export const notFound = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
};
