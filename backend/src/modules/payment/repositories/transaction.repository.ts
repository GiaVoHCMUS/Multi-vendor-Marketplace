import { BaseRepository } from '@/shared/repositories/base.repository';
import { Prisma, Transaction } from '@prisma/client';

export class TransactionRepository extends BaseRepository<
  Transaction,
  Prisma.TransactionCreateInput | Prisma.TransactionUncheckedCreateInput,
  Prisma.TransactionUpdateInput,
  Prisma.TransactionFindManyArgs,
  Prisma.TransactionWhereInput
> {
  constructor() {
    super('transaction');
  }

  /**
   * Tạo một bản ghi giao dịch mới (Thanh toán, Hoàn tiên, Rút tiền, ...)
   */
  async createTransaction(data: Prisma.TransactionUncheckedCreateInput) {
    return this.create(data);
  }

  /**
   * Lấy lịch sử giao dịch của một Shop để hiển thị trên Dashboard Seller
   */
  async findShopHistory(shopId: string, limit: number = 10) {
    return this.findAll({ shopId }, { take: limit, orderBy: { createdAt: 'desc' } });
  }
}
