import { NextFunction, Request, Response } from 'express';
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import { AppError } from '../utils/AppError';
import { catchAsync } from '../utils/catchAsync';
import { StatusCodes } from 'http-status-codes';

export const rateLimitMiddlware = (limiter: RateLimiterRedis) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const key = req.user ? req.user.id : req.ip;

    try {
      await limiter.consume(key as string);
      next();
    } catch (rateLimiterRes) {
      console.log('Lý do bị block:', rateLimiterRes);
      const retryAfter =
        Math.round((rateLimiterRes as RateLimiterRes).msBeforeNext / 1000) || 1;

      // Gửi header Retry-After
      res.set('Retry-After', String(retryAfter));

      throw new AppError(
        'Bạn đang thao tác quá nhanh. Vui lòng thử lại sau.',
        StatusCodes.TOO_MANY_REQUESTS,
        { retryAfter: `Bạn cần chờ ${retryAfter}s rồi thử lại` },
      );
    }
  });
};
