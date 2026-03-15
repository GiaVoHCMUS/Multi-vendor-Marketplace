import { protect, restrictTo } from '@/shared/middleware/auth.middleware';
import { Router } from 'express';
import { categoryController } from './category.controller';
import { upload } from '@/shared/middleware/upload.middleware';
import { validate } from '@/shared/middleware/validate.middleware';
import { categorySchema } from './category.schema';

const router = Router();

router.get('/', categoryController.getAllCategories);
router.get('/:slug', categoryController.getCategoryBySlug);

router.use(protect);
router.use(restrictTo('ADMIN'));
router.post(
  '/',
  upload.single('category_image'),
  validate(categorySchema.create),
  categoryController.create,
);
router.patch(
  '/:id',
  upload.single('category_image'),
  validate(categorySchema.update),
  categoryController.update,
);
router.delete(
  '/:id',
  validate(categorySchema.delete),
  categoryController.delete,
);

export default router;
