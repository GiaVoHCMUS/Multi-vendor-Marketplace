import { protect } from '@/shared/middleware/auth.middleware';
import { Router } from 'express';
import { cartController } from './cart.controller';
import { validate } from '@/shared/middleware/validate.middleware';
import { cartSchema } from './cart.schema';

const router = Router();

router.use(protect);
router.get('/', cartController.getCart);
router.post('/', validate(cartSchema.addToCart), cartController.addToCart);
router.patch(
  '/:productId',
  validate(cartSchema.updateItem),
  cartController.updateItem,
);
router.delete(
  '/:productId',
  validate(cartSchema.removeItem),
  cartController.removeFromCart,
);
router.delete('/', validate(cartSchema.clearCart), cartController.clearCart);

export default router;
