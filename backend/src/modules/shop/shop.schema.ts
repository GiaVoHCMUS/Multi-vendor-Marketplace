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

  getShopOrders: z.object({
    body: emptySchema,
    query: z
      .object({
        status: z.enum(OrderStatus).optional(),
        fromDate: z
          .string()
          .pipe(z.coerce.date({ message: 'Ngày bắt đầu không đúng định dạng' }))
          .optional(),

        toDate: z
          .string()
          .pipe(z.coerce.date({ message: 'Ngày kết thúc không đúng định dạng' }))
          .optional(),
      })
      .refine(
        (data) => {
          if (data.fromDate && data.toDate) {
            return data.fromDate <= data.toDate;
          }
          return true;
        },
        {
          message: 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc',
          path: ['fromDate'],
        },
      ),
    params: emptySchema,
  }),
};
