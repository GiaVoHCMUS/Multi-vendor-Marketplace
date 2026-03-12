import { Router } from 'express';
import { validate } from '@/shared/middleware/validate.middleware';
import { protect } from '@/shared/middleware/auth.middleware';
import { userController } from './user.controller';
import { upload } from '@/shared/middleware/upload.middleware';
import { userSchema } from './user.schema';

const router = Router();

router.use(protect);

router.get('/me', userController.getMe);
router.patch(
  '/me',
  upload.single('avatars'),
  validate(userSchema.updateMe),
  userController.updateMe,
);
router.get('/addresses', userController.getAddresses);
router.post(
  '/addresses',
  validate(userSchema.createAddress),
  userController.createAddress,
);
router.patch(
  '/addresses/:id',
  validate(userSchema.updateAddress),
  userController.updateAddress,
);
router.delete(
  '/addresses/:id',
  validate(userSchema.deleteAddress),
  userController.deleteAddress,
);

export default router;
