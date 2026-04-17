import { protect } from '@/shared/middleware/auth.middleware';
import { Router } from 'express';
import { cartController } from './cart.controller';
import { validate } from '@/shared/middleware/validate.middleware';
import { cartSchema } from './cart.schema';
import { catchAsync } from '@/shared/utils/catchAsync';

const router = Router();

router.use(protect);
router.get('/', catchAsync(cartController.getCart));
router.post(
  '/',
  validate(cartSchema.addToCart),
  catchAsync(cartController.addToCart),
);
router.patch(
  '/:productId',
  validate(cartSchema.updateItem),
  catchAsync(cartController.updateItem),
);
router.delete(
  '/:productId',
  validate(cartSchema.removeItem),
  catchAsync(cartController.removeFromCart),
);
router.delete(
  '/',
  validate(cartSchema.clearCart),
  catchAsync(cartController.clearCart),
);

export default router;
