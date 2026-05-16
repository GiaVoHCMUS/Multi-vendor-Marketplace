import { protect, restrictTo } from '@/shared/middleware/auth.middleware';
import { upload } from '@/shared/middleware/upload.middleware';
import { Router } from 'express';
import { shopSchema } from './shop.schema';
import { shopController } from './shop.module';
import { validate } from '@/shared/middleware/validate.middleware';
import { catchAsync } from '@/shared/utils/catchAsync';
import { rateLimitMiddlware } from '@/shared/middleware/limiter.middlware';
import { managementLimiter } from '@/core/limiter/limiter.config';

const router = Router();

router.use(protect);
router.post(
  '/register',
  rateLimitMiddlware(managementLimiter),
  upload.single('logo'),
  validate(shopSchema.register),
  catchAsync(shopController.register),
);

router.use(restrictTo('SELLER'));
router.get('/me', catchAsync(shopController.getMyShop));
router.patch(
  '/me',
  rateLimitMiddlware(managementLimiter),
  upload.single('logo'),
  validate(shopSchema.updateMyShop),
  catchAsync(shopController.updateMyShop),
);
router.get(
  '/orders',
  validate(shopSchema.getShopOrders),
  catchAsync(shopController.getShopOrders),
);
router.patch(
  '/orders/:id/status',
  rateLimitMiddlware(managementLimiter),
  validate(shopSchema.updateOrderStatus),
  catchAsync(shopController.updateOrderStatus),
);
router.get('/analytics', catchAsync(shopController.getShopAnalytics));

export default router;
