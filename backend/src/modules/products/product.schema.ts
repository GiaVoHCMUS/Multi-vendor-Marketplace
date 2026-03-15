import { commonRules, emptySchema } from '@/shared/schemas/common.schema';
import { z } from 'zod';

const productBaseSchema = z.object({
  shopId: commonRules.id,
  categoryId: commonRules.idInt,
  name: z
    .string({ message: 'Tên sản phẩm là bắt buộc' })
    .trim()
    .min(2, { message: 'Tên sản phẩm quá ngắn' })
    .max(255, { message: 'Tên sản phẩm quá dài' }),

  description: z
    .string()
    .max(1000, { message: 'Mô tả về cửa hàng quá dài' })
    .optional(),

  price: z.coerce
    .number({ message: 'Giá sản phẩm phải là một con số' })
    .positive({ message: 'Giá sản phẩm phải là một số nguyên dương' }),

  stock: z.coerce
    .number({
      message: 'Số lượng tồn kho của sản phẩm phải là một con số',
    })
    .int({
      message: 'Số lượng tồn kho của sản phẩm phải là một số nguyên',
    })
    .min(0, { message: 'Số lượng tồn kho của sản phẩm phải không âm' }),

  status: z.enum(['DRAFT', 'PUBLISHED', 'OUT_OF_STOCK'], {
    message: 'Trạng thái sản phẩm không hợp lệ',
  }),
});

export const productSchema = {
  create: z.object({
    body: productBaseSchema,
    query: emptySchema,
    params: emptySchema,
  }),
  update: z.object({
    body: productBaseSchema.partial(),
    query: emptySchema,
    params: z.object({
      id: commonRules.id,
    }),
  }),
  delete: z.object({
    body: emptySchema,
    query: emptySchema,
    params: z.object({
      id: commonRules.id,
    }),
  }),
};
