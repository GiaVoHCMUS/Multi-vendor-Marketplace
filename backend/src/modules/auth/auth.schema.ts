// src/modules/auth/auth.schema.ts
import { z } from 'zod';
import { commonRules } from '@/shared/schemas/common.schema';

export const registerSchema = z.object({
  body: z.object({
    email: commonRules.email,
    password: commonRules.password,
    fullName: commonRules.fullName,
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: commonRules.email,
    password: commonRules.password,
  }),
});
