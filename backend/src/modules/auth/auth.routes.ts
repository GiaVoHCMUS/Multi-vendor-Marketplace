import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '@/shared/middleware/validate.middleware';

import { protect } from '@/shared/middleware/auth.middleware';
import { authSchema } from './auth.schema';
import { rateLimitMiddlware } from '@/shared/middleware/limiter.middlware';
import { authLimiter, mailLimiter } from '@/core/limiter/limiter.config';

const router = Router();

router.post(
  '/register',
  rateLimitMiddlware(authLimiter),
  validate(authSchema.register),
  authController.register,
);
router.post(
  '/login',
  rateLimitMiddlware(authLimiter),
  validate(authSchema.login),
  authController.login,
);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', protect, authController.logout);
router.get('/verify-email', authController.verifyEmail);
router.post(
  '/forgot-password',
  rateLimitMiddlware(mailLimiter),
  validate(authSchema.forgotPassword),
  authController.forgotPassword,
);
router.post(
  '/reset-password',
  validate(authSchema.resetPassword),
  authController.resetPassword,
);

export default router;
