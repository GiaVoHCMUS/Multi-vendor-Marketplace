import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export const requireFile = (fieldName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.file && !req.files) {
      return next(new AppError(`Thiếu file ${fieldName}`, 400));
    }

    next();
  };
};

