import { upload } from '@/shared/middleware/upload.middleware';
import { Router } from 'express';
import { productSchema } from './product.schema';
import { productController } from './product.controller';
import { protect, restrictTo } from '@/shared/middleware/auth.middleware';
import { validate } from '@/shared/middleware/validate.middleware';
import { validateProductImages } from '@/shared/middleware/validateImage.middlware';

const router = Router();

router.get('/', validate(productSchema.productQuery), productController.getAll);
router.get('/:slug', productController.getBySlug);

router.use(protect);
router.use(restrictTo('SELLER'));
router.post(
  '/',
  upload.array('product_images', 5),
  validateProductImages,
  validate(productSchema.create),
  productController.create,
);
router.patch(
  '/:id',
  upload.array('product_images', 5),
  validate(productSchema.update),
  productController.update,
);
router.delete('/:id', validate(productSchema.delete), productController.delete);

export default router;
