import { z } from 'zod';
import { orderSchema } from './order.schema';

export type CheckoutInput = z.infer<typeof orderSchema.checkout.shape.body>;
export type UpdateOrderStatusInput = z.infer<
  typeof orderSchema.checkout.shape.body
>;