import { commonRules, emptySchema } from '@/shared/schemas/common.schema';
import { OrderStatus } from '@prisma/client';
import { z } from 'zod';

export const shopSchema = {
  register: z.object({
    body: z.object({
      name: commonRules.shopName,
      description: commonRules.shopDescription,
    }),
    query: emptySchema,
    param: emptySchema,
  }),

  updateMyShop: z.object({
    body: z.object({
      name: commonRules.shopName.optional(),
      description: commonRules.shopDescription,
    }),
    query: emptySchema,
    params: emptySchema,
  }),

  updateOrderStatus: z.object({
    body: z.object({
      status: z.enum(OrderStatus),
    }),
    query: emptySchema,
    params: commonRules.id,
  }),
};
