import { Router } from 'express';
import { validate } from '@/shared/middleware/validate.middleware';
import { protect } from '@/shared/middleware/auth.middleware';
import { upload } from '@/shared/middleware/upload.middleware';
import { userController } from './user.module';
import { userSchema } from './user.schema';
import { catchAsync } from '@/shared/utils/catchAsync';
import { rateLimitMiddlware } from '@/shared/middleware/limiter.middlware';
import { managementLimiter } from '@/core/limiter/limiter.config';

const router = Router();

router.use(protect);

router.get('/me', catchAsync(userController.getMe));
router.patch(
  '/me',
  rateLimitMiddlware(managementLimiter),
  upload.single('avatars'),
  validate(userSchema.updateMe),
  catchAsync(userController.updateMe),
);
router.get('/addresses', catchAsync(userController.getAddresses));
router.post(
  '/addresses',
  rateLimitMiddlware(managementLimiter),
  validate(userSchema.createAddress),
  catchAsync(userController.createAddress),
);
router.patch(
  '/addresses/:id',
  rateLimitMiddlware(managementLimiter),
  validate(userSchema.updateAddress),
  catchAsync(userController.updateAddress),
);
router.delete(
  '/addresses/:id',
  rateLimitMiddlware(managementLimiter),
  validate(userSchema.deleteAddress),
  catchAsync(userController.deleteAddress),
);

export default router;
