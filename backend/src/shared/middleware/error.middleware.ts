// src/middleware/errorMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { ZodError } from 'zod';
import multer from 'multer';

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // 1. Nếu là ZodError -> Biến nó thành AppError (400)
  if (err instanceof ZodError) {
    const formattedErrors = err.issues.map((e) => ({
      path: e.path[1],
      message: e.message,
    }));
    error = new AppError('Dữ liệu nhập vào không hợp lệ', 400, formattedErrors);
  }

  // 2. Nếu là lỗi của Prisma
  if (err.code == 'P2025') {
    error = new AppError('Không tìm thấy dữ liệu yêu cầu', 404);
  }

  // 3. Nếu là lỗi của Multer
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      error = new AppError('Dung lượng file quá lớn', 400)
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      error = new AppError('Quá nhiều files được tải lên', 400);
    }
  }

  // Phân loại phản hồi
  const statusCode = error.statusCode || 500;
  const message = error.isOperational ? error.message : 'Internal Server Error';

  if (!error.isOperational) {
    console.log('[ERROR]: ', err);
  }

  return res.status(statusCode).json({
    success: false,
    message,
    errors: error.errors || null, // Nơi chứa chi tiết lỗi
  });
};
