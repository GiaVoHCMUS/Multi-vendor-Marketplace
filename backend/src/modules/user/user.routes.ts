import { Router } from 'express';
import { validate } from '@/shared/middleware/validate.middleware';
import { protect } from '@/shared/middleware/auth.middleware';
import { userController } from './user.controller';
import { upload } from '@/shared/middleware/upload.middleware';
import { userSchema } from './user.schema';
import { catchAsync } from '@/shared/utils/catchAsync';

const router = Router();

router.use(protect);

router.get('/me', catchAsync(userController.getMe));
router.patch(
  '/me',
  upload.single('avatars'),
  validate(userSchema.updateMe),
  catchAsync(userController.updateMe),
);
router.get('/addresses', catchAsync(userController.getAddresses));
router.post(
  '/addresses',
  validate(userSchema.createAddress),
  catchAsync(userController.createAddress),
);
router.patch(
  '/addresses/:id',
  validate(userSchema.updateAddress),
  catchAsync(userController.updateAddress),
);
router.delete(
  '/addresses/:id',
  validate(userSchema.deleteAddress),
  catchAsync(userController.deleteAddress),
);

export default router;
