import { BaseRepository } from '@/shared/repositories/base.repository';
import { OrderItem, Prisma } from '@prisma/client';

export class OrderItemRepository extends BaseRepository<
  OrderItem,
  Prisma.OrderItemCreateInput | Prisma.OrderItemUncheckedCreateInput,
  Prisma.OrderItemUpdateInput,
  Prisma.OrderFindManyArgs,
  Prisma.OrderItemWhereInput
> {
  constructor() {
    super('orderItem');
  }

  async createOrderItem(data: Prisma.OrderItemUncheckedCreateInput) {
    return this.create(data);
  }

  async createManyOrderItems(data: Prisma.OrderItemUncheckedCreateInput[]) {
    return this.createMany(data, true);
  }
}
