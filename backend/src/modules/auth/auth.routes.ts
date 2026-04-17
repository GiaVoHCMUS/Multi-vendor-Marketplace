import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '@/shared/middleware/validate.middleware';

import { protect } from '@/shared/middleware/auth.middleware';
import { authSchema } from './auth.schema';
import { rateLimitMiddlware } from '@/shared/middleware/limiter.middlware';
import { authLimiter, mailLimiter } from '@/core/limiter/limiter.config';
import { catchAsync } from '@/shared/utils/catchAsync';

const router = Router();

router.post(
  '/register',
  rateLimitMiddlware(authLimiter),
  validate(authSchema.register),
  catchAsync(authController.register),
);
router.post(
  '/login',
  rateLimitMiddlware(authLimiter),
  validate(authSchema.login),
  catchAsync(authController.login),
);
router.post('/refresh-token', catchAsync(authController.refreshToken));
router.post('/logout', protect, catchAsync(authController.logout));
router.get('/verify-email', catchAsync(authController.verifyEmail));
router.post(
  '/forgot-password',
  rateLimitMiddlware(mailLimiter),
  validate(authSchema.forgotPassword),
  catchAsync(authController.forgotPassword),
);
router.post(
  '/reset-password',
  validate(authSchema.resetPassword),
  catchAsync(authController.resetPassword),
);

export default router;
