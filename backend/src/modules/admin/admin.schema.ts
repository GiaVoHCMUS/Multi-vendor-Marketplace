import { commonRules, emptySchema } from '@/shared/schemas/common.schema';
import { OrderStatus } from '@prisma/client';
import { z } from 'zod';

export const adminSchema = {
  approveShop: z.object({
    body: emptySchema,
    query: emptySchema,
    params: z.object({
      id: commonRules.id,
    }),
  }),

  banShop: z.object({
    body: emptySchema,
    query: emptySchema,
    params: z.object({
      id: commonRules.id,
    }),
  }),

  banUser: z.object({
    body: emptySchema,
    query: emptySchema,
    params: z.object({
      id: commonRules.id,
    }),
  }),

  getPendingShops: z.object({
    body: emptySchema,
    query: z.object({
      page: commonRules.page,
      limit: commonRules.limit,
    }),
    params: emptySchema,
  }),

  getUsers: z.object({
    body: emptySchema,
    params: emptySchema,
    query: z.object({
      page: commonRules.page,
      limit: commonRules.limit,
      search: z.string().trim().optional(),
    }),
  }),

  getOrders: z.object({
    body: emptySchema,
    params: emptySchema,
    query: z.object({
      page: commonRules.page,
      limit: commonRules.limit,
      status: z
        .enum(OrderStatus)
        .optional(),
    }),
  }),
};
