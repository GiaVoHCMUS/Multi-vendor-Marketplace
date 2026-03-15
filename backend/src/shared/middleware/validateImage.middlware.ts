import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/shared/utils/AppError';

export const validateProductImages = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    return next(new AppError('Sản phẩm phải có ít nhất 1 hình ảnh', 400));
  }

  if (files.length > 5) {
    return next(new AppError('Tối đa 5 hình ảnh cho mỗi sản phẩm', 400));
  }

  next();
};
