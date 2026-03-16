import { z } from 'zod';
import { cartSchema } from './cart.schema';

export type AddToCartInput = z.infer<typeof cartSchema.addToCart.shape.body>;
export type UpdateItemInput = z.infer<typeof cartSchema.updateItem.shape.body>;