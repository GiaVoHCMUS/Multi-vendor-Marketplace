import { BaseRepository } from '@/shared/repositories/base.repository';
import {
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PayoutStatus,
  Prisma,
  PrismaClient,
  TransactionType,
} from '@prisma/client';
import { CheckoutInput } from './order.type';
import { checkAndCompleteOrderGroup } from './order.helper';
import { PrismaQueryHelper } from '@/shared/query/prisma-query.helper';

export type CheckoutItemPayload = {
  product: {
    name: string;
    id: string;
    shopId: string;
    slug: string;
    categoryId: number;
    price: Prisma.Decimal;
    stock: number;
  };
  quantity: number;
  price: number;
};

export type OrderWithDetails = Prisma.OrderGetPayload<{
  include: {
    shop: true;
    orderGroup: true;
    orderItems: true;
  };
}>;

export class OrderRepository extends BaseRepository<
  Order,
  Prisma.OrderCreateInput,
  Prisma.OrderUpdateInput,
  Prisma.OrderFindManyArgs,
  Prisma.OrderWhereInput
> {
  constructor() {
    super('order');
  }

  // Khai báo sẵn các trường cần Select để tái sử dụng và code gọn hơn
  private orderSelect: Prisma.OrderSelect = {
    id: true,
    orderGroupId: true,
    shopId: true,
    totalAmount: true,
    status: true,
    payoutStatus: true,
    payoutAt: true,

    shop: { select: { id: true, name: true, slug: true } },

    orderItems: {
      select: {
        id: true,
        productId: true,
        quantity: true,
        priceAtPurchase: true,
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            images: { take: 1, select: { id: true, url: true } },
          },
        },
      },
    },

    orderGroup: {
      select: {
        shippingAddress: true,
        shippingName: true,
        shippingPhone: true,
      },
    },
  };

  /**
   * Lấy chi tiết một đơn hàng kèm theo các relation (Shop, Items, Group, ...)
   */
  async findOrderDetail(userId: string, orderId: string) {
    return this.findOne(
      {
        id: orderId,
        orderGroup: { userId },
      },
      {
        select: {
          id: true,
          orderGroupId: true,
          totalAmount: true,
          status: true,
          updatedAt: true,

          shop: {
            select: {
              id: true,
              ownerId: true,
              name: true,
              slug: true,
              logoUrl: true,
            },
          },

          orderItems: {
            select: {
              id: true,
              quantity: true,
              priceAtPurchase: true,

              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,

                  images: {
                    select: {
                      id: true,
                      url: true,
                      order: true,
                    },
                  },
                },
              },
            },
          },

          orderGroup: {
            select: {
              paymentStatus: true,
              paymentMethod: true,

              shippingName: true,
              shippingPhone: true,
              shippingAddress: true,

              updatedAt: true,
            },
          },

          transactions: true,
        },
      },
    );
  }

  /**
   * Lấy danh sách đơn hàng của User với phân trang (Offset Pagination)
   */
  async findOrderList(userId: string, queryInput: any) {
    const queryHelper = new PrismaQueryHelper(queryInput)
      .paginate()
      .applyFilter((q) => ({
        ...(q.status && { status: q.status }),
        orderGroup: { userId },
      }))
      .sort()
      .select(this.orderSelect);

    const { prismaArgs, meta } = queryHelper.build();

    const prismaOrder = (this.client as PrismaClient).order;

    const [orders, total] = await Promise.all([
      prismaOrder.findMany({
        ...prismaArgs,
        orderBy: prismaArgs.orderBy ?? { createdAt: 'desc' },
      }),

      prismaOrder.count({ where: prismaArgs.where }),
    ]);

    return { orders, total, meta };
  }

  /**
   * Transaction: Tạo Group, Order, OrderItem và trừ Stock
   */
  async createCheckoutTransaction(
    userId: string,
    totalAmount: number,
    data: CheckoutInput,
    shopMap: Map<string, CheckoutItemPayload[]>,
  ) {
    const prismaClient = this.client as PrismaClient;

    return await prismaClient.$transaction(async (tx) => {
      // 1. Lưu OrderGroup vào database
      const orderGroup = await tx.orderGroup.create({
        data: {
          userId,
          totalAmount,
          paymentMethod: data.paymentMethod,
          paymentStatus: PaymentStatus.PENDING,
          shippingName: data.shippingName,
          shippingPhone: data.shippingPhone,
          shippingAddress: data.shippingAddress,
        },
      });

      // 2. Chia các orderGroup đó thành các Order nhỏ hơn (theo Shop)
      // Tạo Order theo từng shop và lưu OrderItem cho cho Order này, cũng như trừ số lượng Products của seller
      for (const [shopId, items] of shopMap) {
        const shopTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

        const order = await tx.order.create({
          data: {
            orderGroupId: orderGroup.id,
            shopId,
            totalAmount: shopTotal,
            status: OrderStatus.PENDING,
          },
        });

        for (const item of items) {
          await tx.orderItem.create({
            data: {
              orderId: order.id,
              productId: item.product.id,
              quantity: item.quantity,
              priceAtPurchase: item.price,
            },
          });

          await tx.product.update({
            where: { id: item.product.id },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      return orderGroup;
    });
  }

  /**
   * Lấy chi tiết đơn hàng kèm các relation cần thiết để xử lý cập nhật đơn hàng
   */
  async findOrderWithDetails(orderId: string) {
    return this.findById(orderId, {
      include: {
        shop: true,
        orderGroup: true,
        orderItems: true,
      },
    }) as Promise<OrderWithDetails | null>;
  }

  /**
   * Transaction: Cập nhật trạng thái đơn hàng, hoàn kho hoặc đối soát tiền
   */
  async updateStatusTransaction(orderId: string, order: OrderWithDetails, nextStatus: OrderStatus) {
    const prismaClient = this.client as PrismaClient;

    return await prismaClient.$transaction(async (tx) => {
      // 1. Cập nhật trạng thái mới cho Order
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: nextStatus },
      });

      // 2. Nếu Seller cập nhật đơn hàng là bị hủy
      if (nextStatus === OrderStatus.CANCELLED) {
        for (const item of order.orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }

        // Tạo Transaction ghi nhận hủy đơn (chỉ thông tin, không thay đổi tiền)
        await tx.transaction.create({
          data: {
            type: TransactionType.REFUND,
            amount: 0, // COD chưa trả tiền → ghi 0
            status: PaymentStatus.COMPLETED,
            shopId: order.shopId,
            orderId: order.id,
            orderGroupId: order.orderGroupId,
            description: 'Đơn hàng bị hủy, rollback stock',
          },
        });
      }

      // 3. Logic xử lý khi đơn hàng giao hàng thành công và tiền mặt COD
      if (
        nextStatus === OrderStatus.DELIVERED &&
        order.orderGroup.paymentMethod === PaymentMethod.COD
      ) {
        // Đánh dấu là đã đối soát
        await tx.order.update({
          where: { id: orderId },
          data: { payoutStatus: PayoutStatus.PAID_OUT, payoutAt: new Date() },
        });

        // Cộng tiền vào số dư cho Shop
        await tx.shop.update({
          where: { id: order.shopId },
          data: { balance: { increment: Number(order.totalAmount) } },
        });

        // Tạo Transaction ghi nhận tiền
        await tx.transaction.create({
          data: {
            type: TransactionType.PAYMENT,
            amount: order.totalAmount,
            status: PaymentStatus.COMPLETED,
            shopId: order.shopId,
            orderId: order.id,
            orderGroupId: order.orderGroupId,
            description: 'Đơn hàng thanh toán khi nhận hàng đã được giao',
          },
        });

        // Kiểm tra và cập nhật orderGroup
        await checkAndCompleteOrderGroup(tx, order.orderGroupId);
      }

      return updatedOrder;
    });
  }

  /**
   * Lấy danh sách đơn hàng cho một Shop (Dành cho Seller)
   */
  async findShopOrders(shopId: string, queryInput: any) {
    const queryHelper = new PrismaQueryHelper(queryInput)
      .paginate()
      .applyFilter((q) => ({
        shopId, // Bắt buộc lọc theo shopId
        ...(q.status && { status: q.status }),
        ...(q.fromDate &&
          q.toDate && {
            createdAt: {
              gte: new Date(q.fromDate),
              lte: new Date(q.toDate),
            },
          }),
      }))
      .sort()
      // Định nghĩa luôn các trường cần select trả về cho Seller
      .select({
        id: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        orderItems: {
          include: {
            product: { select: { id: true, name: true, slug: true } },
          },
        },
        orderGroup: {
          select: {
            userId: true,
            paymentStatus: true,
            paymentMethod: true,
            createdAt: true,
          },
        },
      });

    const { prismaArgs, meta } = queryHelper.build();
    const prismaOrder = (this.client as PrismaClient).order;

    const [orders, total] = await Promise.all([
      prismaOrder.findMany({
        ...prismaArgs,
        orderBy: prismaArgs.orderBy ?? { createdAt: 'desc' },
      }),
      prismaOrder.count({ where: prismaArgs.where }),
    ]);

    return { orders, total, meta };
  }

  /**
   * Lấy số liệu thống kê cho Dashboard của Shop (Tổng đơn, Đơn hoàn thành, Doanh thu)
   */
  async getShopAnalyticsStats(shopId: string) {
    const [totalOrders, deliveredOrders, revenue] = await Promise.all([
      // 1. Tổng số đơn
      this.count({ shopId }),

      // 2. Số đơn đã giao
      this.count({ shopId, status: OrderStatus.DELIVERED }),

      // 3. Tổng doanh thu (Chỉ tính các đơn đã giao)
      this.modelDelegate.aggregate({
        where: { shopId, status: OrderStatus.DELIVERED },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      totalOrders,
      deliveredOrders,
      // Handle trường hợp revenue._sum.totalAmount là null (khi chưa có đơn nào)
      revenue: revenue._sum.totalAmount ? Number(revenue._sum.totalAmount) : 0,
    };
  }

  async countTotalOrders() {
    return this.count();
  }

  async calculateTotalRevenue() {
    const result = await (this.client as PrismaClient).orderGroup.aggregate({
      _sum: { totalAmount: true },
      where: { paymentStatus: PaymentStatus.COMPLETED },
    });
    return Number(result._sum.totalAmount ?? 0);
  }

  async findOrdersForAdmin(queryInput: any) {
    const queryHelper = new PrismaQueryHelper(queryInput)
      .paginate()
      .applyFilter((q) => ({
        ...(q.status && { status: q.status }),
      }))
      .sort();

    const { prismaArgs, meta } = queryHelper.build();
    const prismaOrder = (this.client as PrismaClient).order;

    const [orders, total] = await Promise.all([
      prismaOrder.findMany({
        ...prismaArgs,
        include: {
          shop: { select: { id: true, name: true } },
          orderGroup: { select: { userId: true, paymentStatus: true } },
          orderItems: { include: { product: { select: { id: true, name: true } } } },
        },
        orderBy: prismaArgs.orderBy ?? { createdAt: 'desc' },
      }),
      prismaOrder.count({ where: prismaArgs.where }),
    ]);

    return { orders, total, meta };
  }
}
