import { Response } from 'express';

export const successResponse = <T, M>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T,
  meta?: M,
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data: data ?? null,
    meta: meta ?? null,
  });
};

export const errorResponse = (
  res: Response,
  statusCode: number,
  message: string,
  errors?: unknown,
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors: errors ?? null,
  });
};
