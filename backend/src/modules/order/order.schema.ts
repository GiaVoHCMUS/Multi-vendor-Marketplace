import { commonRules, emptySchema } from '@/shared/schemas/common.schema';
import { OrderStatus, PaymentMethod } from '@prisma/client';
import { z } from 'zod';

export const orderSchema = {
  getMyOrder: z.object({
    body: emptySchema,
    query: z.object({
      page: z.coerce
        .number({ message: 'Trang phải là một con số' })
        .int({ message: 'Trang phải là số nguyên' })
        .positive({ message: 'Trang phải là số nguyên dương' })
        .default(1),
      limit: z.coerce
        .number({ message: 'Trang phải là một con số' })
        .int({ message: 'Trang phải là số nguyên' })
        .positive({ message: 'Trang phải là số nguyên dương' })
        .default(10),
      status: z.enum(OrderStatus).optional(),
    }),
    params: emptySchema,
  }),

  checkout: z.object({
    body: z.object({
      paymentMethod: z.enum(PaymentMethod),
      shippingName: commonRules.fullName,
      shippingPhone: commonRules.phoneNumber,
      shippingAddress: commonRules.detailAddress,
    }),
    query: emptySchema,
    params: emptySchema,
  }),

  getOrderDetail: z.object({
    body: emptySchema,
    query: emptySchema,
    params: z.object({
      id: commonRules.id,
    }),
  }),

  updateStatus: z.object({
    body: z.object({
      status: z.enum(OrderStatus),
    }),
    query: emptySchema,
    params: z.object({
      id: commonRules.id,
    }),
  }),
};
