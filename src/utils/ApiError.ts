// src/utils/ApiError.ts
export class ApiError extends Error {
  public statusCode: number;
  public errors: string[];
  public success: boolean;

  constructor(
    statusCode: number,
    message: string,
    errors: string[] = [],
    stack?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.success = false;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
