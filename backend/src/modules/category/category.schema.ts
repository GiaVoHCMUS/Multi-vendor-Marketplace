import {
  categoryRules,
  commonRules,
  emptySchema,
} from '@/shared/schemas/common.schema';
import { z } from 'zod';

export const categorySchema = {
  create: z.object({
    body: z.object({
      name: categoryRules.name,
      parentId: commonRules.idInt.optional(),
    }),
    query: emptySchema,
    params: emptySchema,
  }),

  update: z.object({
    body: z.object({
      name: categoryRules.name.optional(),
      parentId: commonRules.idInt.optional(),
    }),
    query: emptySchema,
    params: z.object({
      id: commonRules.idInt,
    }),
  }),
  delete: z.object({
    body: emptySchema,
    query: emptySchema,
    params: z.object({
      id: commonRules.idInt,
    }),
  }),
};
