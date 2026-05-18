import { Prisma, PrismaClient } from '@prisma/client';

export class TransactionManager {
  constructor(private readonly prisma: PrismaClient) {}

  async run<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    },
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      return fn(tx);
    }, options);
  }
}
