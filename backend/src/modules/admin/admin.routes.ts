import { protect, restrictTo } from '@/shared/middleware/auth.middleware';
import { Router } from 'express';
import { adminController } from './admin.controller';
import { validate } from '@/shared/middleware/validate.middleware';
import { adminSchema } from './admin.schema';

const router = Router();

router.use(protect);
router.use(restrictTo('ADMIN'));
router.patch(
  '/shops/:id/approve',
  validate(adminSchema.approveShop),
  adminController.approveShop,
);

router.patch(
  '/shops/:id/ban',
  validate(adminSchema.banShop),
  adminController.banShop,
);

router.patch(
  '/users/:id/ban',
  validate(adminSchema.banUser),
  adminController.banUser,
);

router.get('/dashboard', adminController.getStats);

router.get(
  '/shops/pending',
  validate(adminSchema.getPendingShops),
  adminController.getPendingShops,
);

router.get('/users', validate(adminSchema.getUsers), adminController.getUsers);

router.get(
  '/orders',
  validate(adminSchema.getOrders),
  adminController.getOrders,
);

export default router;
