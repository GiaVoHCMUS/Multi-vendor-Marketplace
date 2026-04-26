import { z } from 'zod';
import { productSchema } from './product.schema';

export type CreateProductInput = z.infer<typeof productSchema.create.shape.body>;

export type UpdateProductInput = z.infer<typeof productSchema.update.shape.body>;

export type GetProductsQuery = z.infer<typeof productSchema.getAll.shape.query>;
