// src/utils/appError.ts
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  errors?: any;

  constructor(message: string, statusCode: number, errors?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errors = errors || null;

    Error.captureStackTrace(this, this.constructor);
  }
}
