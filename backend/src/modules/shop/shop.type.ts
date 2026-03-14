import { z } from 'zod';
import { shopSchema } from './shop.schema';

export type RegisterShopInput = z.infer<typeof shopSchema.register.shape.body>
export type UpdateMyShopInput = z.infer<typeof shopSchema.updateMyShop.shape.body>