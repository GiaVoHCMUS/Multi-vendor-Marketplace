import { z } from 'zod';
import { productSchema } from './product.schema';

export type CreateProductInput = z.infer<
  typeof productSchema.create.shape.body
>;
export type UpdateProductInput = z.infer<
  typeof productSchema.update.shape.body
>;
export type ProductQueryInput = z.infer<
  typeof productSchema.productQuery.shape.query
>;