// src/modules/auth/auth.schema.ts
import { z } from 'zod';
import { commonRules } from '@/shared/schemas/common.schema';

export const authSchema = {
  register: z.object({
    body: z.object({
      email: commonRules.email,
      password: commonRules.password,
      fullName: commonRules.fullName,
    }),
  }),

  login: z.object({
    body: z.object({
      email: commonRules.email,
      password: commonRules.password,
    }),
  }),
};
