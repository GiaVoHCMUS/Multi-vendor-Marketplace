import { z } from 'zod';
import { categorySchema } from './category.schema';

export type CreateCategoryInput = z.infer<
  typeof categorySchema.create.shape.body
>;
export type UpdateCategoryInput = z.infer<
  typeof categorySchema.update.shape.body
>;
