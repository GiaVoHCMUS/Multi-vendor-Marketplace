import { Prisma, PrismaClient } from '@prisma/client';

export class TransactionManger {
  constructor(private readonly prisma: PrismaClient) {}

  async run<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      return fn(tx);
    });
  }
}
