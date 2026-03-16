import { z } from 'zod';
import { adminSchema } from './admin.schema';

export type GetUsersQuery = z.infer<typeof adminSchema.getUsers.shape.query>;
export type GetOrdersQuery = z.infer<typeof adminSchema.getOrders.shape.query>;
export type PaginationQuery = z.infer<typeof adminSchema.getPendingShops.shape.query>;
