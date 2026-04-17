import { upload } from '@/shared/middleware/upload.middleware';
import { Router } from 'express';
import { productSchema } from './product.schema';
import { productController } from './product.controller';
import { protect, restrictTo } from '@/shared/middleware/auth.middleware';
import { validate } from '@/shared/middleware/validate.middleware';
import { validateProductImages } from '@/shared/middleware/validateImage.middlware';
import { rateLimitMiddlware } from '@/shared/middleware/limiter.middlware';
import {
  managementLimiter,
  publicLimiter,
} from '@/core/limiter/limiter.config';
import { catchAsync } from '@/shared/utils/catchAsync';

const router = Router();

router.get(
  '/',
  rateLimitMiddlware(publicLimiter),
  validate(productSchema.productQuery),
  catchAsync(productController.getAll),
);
router.get(
  '/:slug',
  rateLimitMiddlware(publicLimiter),
  catchAsync(productController.getBySlug),
);

router.use(protect);
router.use(restrictTo('SELLER'));
router.use(rateLimitMiddlware(managementLimiter)); // Middleware để Rate-limit thêm, sửa, xóa

router.post(
  '/',
  upload.array('product_images', 5),
  validateProductImages,
  validate(productSchema.create),
  catchAsync(productController.create),
);
router.patch(
  '/:id',
  upload.array('product_images', 5),
  validate(productSchema.update),
  catchAsync(productController.update),
);
router.delete(
  '/:id',
  validate(productSchema.delete),
  catchAsync(productController.delete),
);

export default router;
