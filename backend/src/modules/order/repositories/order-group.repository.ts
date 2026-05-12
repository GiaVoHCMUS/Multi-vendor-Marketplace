import { BaseRepository } from '@/shared/repositories/base.repository';
import { OrderGroup, PaymentStatus, Prisma } from '@prisma/client';

export class OrderGroupRepository extends BaseRepository<
  OrderGroup,
  Prisma.OrderGroupCreateInput | Prisma.OrderGroupUncheckedCreateInput,
  Prisma.OrderGroupUpdateInput,
  Prisma.OrderGroupFindManyArgs,
  Prisma.OrderGroupWhereInput
> {
  constructor() {
    super('orderGroup');
  }

  async createOrderGroup(data: Prisma.OrderGroupUncheckedCreateInput) {
    return this.create(data);
  }

  /**
   * Cập nhật trạng thái thanh toán hoàn tất cho cả nhóm đơn hàng
   */
  async updatePaymentStatus(orderGroupId: string, status: PaymentStatus) {
    return this.update(orderGroupId, { paymentStatus: status });
  }
}
