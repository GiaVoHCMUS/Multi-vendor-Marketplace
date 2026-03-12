import { z } from 'zod';
import { userSchema } from './user.schema';

export type UpdateMeInput = z.infer<typeof userSchema.updateMe.shape.body>;
export type CreateAddressInput = z.infer<typeof userSchema.createAddress.shape.body>;
export type UpdateAddressInput = z.infer<typeof userSchema.updateAddress.shape.body>;
