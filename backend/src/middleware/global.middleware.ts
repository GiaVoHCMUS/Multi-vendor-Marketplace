// src/middleware/errorMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const statusCode = err.statusCode || 500;

  // Nếu là isOperational thì ta hiện message, còn nếu là lỗi do code bug thì hiện Internal Server Error
  const message = err.isOperational ? err.message : 'Internal Server Error';

  if (!err.isOperational) {
    console.log('[ERROR]: ', err);
  }

  return res.status(statusCode).json({
    success: false,
    message,
    errors: err.errors || null, // Nơi chứa chi tiết lỗi
  });
};
