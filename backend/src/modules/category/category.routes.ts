import { protect, restrictTo } from '@/shared/middleware/auth.middleware';
import { Router } from 'express';
import { categoryController } from './category.controller';
import { upload } from '@/shared/middleware/upload.middleware';
import { validate } from '@/shared/middleware/validate.middleware';
import { categorySchema } from './category.schema';
import { catchAsync } from '@/shared/utils/catchAsync';

const router = Router();

router.get('/', catchAsync(categoryController.getAllCategories));
router.get('/:slug', catchAsync(categoryController.getCategoryBySlug));

router.use(protect);
router.use(restrictTo('ADMIN'));
router.post(
  '/',
  upload.single('category_image'),
  validate(categorySchema.create),
  catchAsync(categoryController.create),
);
router.patch(
  '/:id',
  upload.single('category_image'),
  validate(categorySchema.update),
  catchAsync(categoryController.update),
);
router.delete(
  '/:id',
  validate(categorySchema.delete),
  catchAsync(categoryController.delete),
);

export default router;
