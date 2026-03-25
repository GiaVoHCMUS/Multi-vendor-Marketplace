import { z } from 'zod';
import { commonRules, emptySchema } from '@/shared/schemas/common.schema';

export const authSchema = {
  register: z.object({
    body: z.object({
      email: commonRules.email,
      password: commonRules.password,
      fullName: commonRules.fullName,
    }),
    params: emptySchema,
    query: emptySchema,
  }),

  login: z.object({
    body: z.object({
      email: commonRules.email,
      password: commonRules.password,
    }),
    params: emptySchema,
    query: emptySchema,
  }),

  forgotPassword: z.object({
    body: z.object({
      email: commonRules.email,
    }),
    params: emptySchema,
    query: emptySchema,
  }),

  resetPassword: z.object({
    body: z.object({
      token: z.string('Token là bắt buộc'),
      password: commonRules.password,
    }),
    params: emptySchema,
    query: emptySchema,
  }),
};
