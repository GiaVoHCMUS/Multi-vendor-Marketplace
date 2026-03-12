import { z } from 'zod';
import { commonRules, emptySchema } from '@/shared/schemas/common.schema';

export const userSchema = {
  updateMe: z.object({
    body: z.object({
      fullName: commonRules.fullName.optional(),
      bio: z
        .string()
        .max(500, { message: 'Bio không được dài quá 500 ký tự' })
        .optional(),
    }),
    query: emptySchema,
    params: emptySchema,
  }),

  createAddress: z.object({
    body: z.object({
      receiverName: commonRules.fullName,
      receiverPhone: commonRules.phoneNumber,
      province: commonRules.provice,
      ward: commonRules.ward,
      detailAddress: commonRules.detailAddress,
      isDefault: z.boolean().optional(),
    }),
    query: emptySchema,
    params: emptySchema,
  }),

  updateAddress: z.object({
    body: z.object({
      receiverName: commonRules.fullName.optional(),
      receiverPhone: commonRules.fullName.optional(),
      province: commonRules.fullName.optional(),
      ward: commonRules.fullName.optional(),
      detailAddress: commonRules.detailAddress.optional(),
      isDefault: z.boolean().optional(),
    }),
    params: z.object({
      id: commonRules.id,
    }),
    query: emptySchema,
  }),

  deleteAddress: z.object({
    body: emptySchema,
    query: emptySchema,
    params: z.object({
      id: commonRules.id,
    }),
  }),
};
