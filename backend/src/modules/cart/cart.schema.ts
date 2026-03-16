import { commonRules, emptySchema } from '@/shared/schemas/common.schema';
import { z } from 'zod';

export const cartSchema = {
  addToCart: z.object({
    body: z.object({
      productId: commonRules.id,
      quantity: z.coerce
        .number({
          message: 'Số lượng sản phẩm trong kho phải là một con số',
        })
        .int({ message: 'Số lượng sản phẩm trong kho phải là số nguyên' })
        .positive({ message: 'Số lượng sản phẩm trong kho phải lớn hơn 0' }),
    }),
    query: emptySchema,
    params: emptySchema,
  }),

  updateItem: z.object({
    body: z.object({
      quantity: z.coerce
        .number({
          message: 'Số lượng sản phẩm trong kho phải là một con số',
        })
        .int({ message: 'Số lượng sản phẩm trong kho phải là số nguyên' })
        .positive({ message: 'Số lượng sản phẩm trong kho phải lớn hơn 0' }),
    }),
    query: emptySchema,
    params: z.object({
      productId: commonRules.id,
    }),
  }),

  removeItem: z.object({
    body: emptySchema,
    query: emptySchema,
    params: z.object({
      productId: commonRules.id,
    }),
  }),

  clearCart: z.object({
    body: emptySchema,
    params: emptySchema,
    query: emptySchema,
  }),
};
