import { commonRules, emptySchema } from '@/shared/schemas/common.schema';
import { ProductStatus } from '@prisma/client';
import { z } from 'zod';

const ALLOWED_SORT = ['price:asc', 'price:desc'];

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

  status: z.enum(ProductStatus, {
    message: 'Trạng thái sản phẩm không hợp lệ',
  }),
});

export const productSchema = {
  productQuery: z.object({
    body: emptySchema,
    query: z
      .object({
        limit: commonRules.limit,
        cursor: z.string().optional(),
        search: z
          .string()
          .trim()
          .min(1, { message: 'Nội dung tìm kiếm không hợp lệ' })
          .max(100, { message: 'Nội dung tìm kiếm quá dài' })
          .optional(),

        minPrice: z.coerce
          .number()
          .min(0, { message: 'Giá tối thiểu phải >= 0' })
          .optional(),

        maxPrice: z.coerce
          .number()
          .min(0, { message: 'Giá tối đa phải >= 0' })
          .optional(),

        sort: z
          .enum(ALLOWED_SORT, {
            message:
              'Sort không hợp lệ (chỉ hỗ trợ price:asc hoặc price: desc)',
          })
          .optional(),

        categorySlug: z.string().optional(),

        shopSlug: z.string().optional(),
      })
      .refine(
        (data) =>
          !data.minPrice || !data.maxPrice || data.minPrice <= data.maxPrice,
        {
          message: 'minPrice phải <= maxPrice',
          path: ['minPrice'],
        },
      ),
    params: emptySchema,
  }),
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
