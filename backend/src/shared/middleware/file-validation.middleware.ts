import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { StatusCodes } from 'http-status-codes';

export const requireFile = (fieldName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (
      !req.file &&
      (!req.files || (Array.isArray(req.files) && req.files.length === 0))
    ) {
      return next(
        new AppError(`Thiếu file ${fieldName}`, StatusCodes.BAD_REQUEST),
      );
    }

    next();
  };
};

