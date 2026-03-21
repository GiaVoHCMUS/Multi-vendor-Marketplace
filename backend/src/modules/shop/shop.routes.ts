import { protect, restrictTo } from '@/shared/middleware/auth.middleware';
import { upload } from '@/shared/middleware/upload.middleware';
import { Router } from 'express';
import { shopController } from './shop.controller';
import { shopSchema } from './shop.schema';
import { validate } from '@/shared/middleware/validate.middleware';

const router = Router();

router.use(protect);
router.post(
  '/register',
  upload.single('logo'),
  validate(shopSchema.register),
  shopController.register,
);

router.use(restrictTo('SELLER'));
router.get('/me', shopController.getMyShop);
router.patch(
  '/me',
  upload.single('logo'),
  validate(shopSchema.updateMyShop),
  shopController.updateMyShop,
);
router.get(
  '/orders',
  validate(shopSchema.getShopOrders),
  shopController.getShopOrders,
);
router.patch(
  '/orders/:id/status',
  validate(shopSchema.updateOrderStatus),
  shopController.updateOrderStatus,
);
router.get('/analytics', shopController.getShopAnalytics);

export default router;
