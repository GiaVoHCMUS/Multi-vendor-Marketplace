import { PrismaClient } from '@prisma/client';

// Khởi tạo Prisma Client
export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn', 'info']
      : ['error'],
});

