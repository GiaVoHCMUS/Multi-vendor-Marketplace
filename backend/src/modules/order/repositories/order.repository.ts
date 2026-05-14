import { BaseRepository } from '@/shared/repositories/base.repository';
import {
  Order,
  OrderStatus,
  PaymentStatus,
  PayoutStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import { PrismaQueryHelper } from '@/shared/query/prisma-query.helper';
import { GetMyOrdersQuery } from '../order.type';
import { GetOrdersQuery } from '@/modules/admin/admin.type';

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

export const userOrderDetailSelect = Prisma.validator<Prisma.OrderSelect>()({
  id: true,
  orderGroupId: true,
  totalAmount: true,
  status: true,
  updatedAt: true,
  shop: { select: { id: true, ownerId: true, name: true, slug: true, logoUrl: true } },
  orderItems: {
    select: {
      id: true,
      quantity: true,
      priceAtPurchase: true,
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          images: { select: { id: true, url: true, order: true } },
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
});

export type UserOrderRawPayload = Prisma.OrderGetPayload<{
  select: typeof userOrderDetailSelect;
}>;

export const orderListSelect = Prisma.validator<Prisma.OrderSelect>()({
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
});

// 2. Tạo Type từ biến trên
export type OrderListRawPayload = Prisma.OrderGetPayload<{
  select: typeof orderListSelect;
}>;

export class OrderRepository extends BaseRepository<
  Order,
  Prisma.OrderCreateInput | Prisma.OrderUncheckedCreateInput,
  Prisma.OrderUpdateInput,
  Prisma.OrderFindManyArgs,
  Prisma.OrderWhereInput
> {
  constructor() {
    super('order');
  }

  /**
   * Lấy chi tiết một đơn hàng kèm theo các relation (Shop, Items, Group, ...)
   */
  async findForUserDetail(userId: string, orderId: string) {
    return this.findOne(
      { id: orderId, orderGroup: { userId } },
      { select: userOrderDetailSelect },
    ) as Promise<UserOrderRawPayload | null>;
  }

  /**
   * Lấy danh sách đơn hàng của User với phân trang (Offset Pagination)
   */
  async findOrderList(userId: string, queryInput: GetMyOrdersQuery) {
    const queryHelper = new PrismaQueryHelper(queryInput)
      .paginate()
      .applyFilter((q) => ({
        ...(q.status && { status: q.status }),
        orderGroup: { userId },
      }))
      .sort()
      .select(orderListSelect);

    const { prismaArgs, meta } = queryHelper.build();

    const prismaOrder = (this.client as PrismaClient).order;

    const [orders, total] = await Promise.all([
      prismaOrder.findMany({
        ...prismaArgs,
        orderBy: prismaArgs.orderBy ?? { createdAt: 'desc' },
      }) as unknown as Promise<OrderListRawPayload[]>,

      prismaOrder.count({ where: prismaArgs.where }),
    ]);

    return { orders, total, meta };
  }

  /**
   * Tạo một Order mới
   * Sử dụng Unchecked để có thể truyền trực tiếp Id
   */
  async createOrder(data: Prisma.OrderUncheckedCreateInput) {
    return this.create(data);
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
   * Cập nhật trạng thái thanh toán (Payout) cho đơn hàng sau khi đối soát
   */
  async updatePayoutStatus(orderId: string, payoutStatus: PayoutStatus) {
    return this.update(orderId, {
      payoutStatus,
      payoutAt: payoutStatus === PayoutStatus.PAID_OUT ? new Date() : null,
    });
  }

  /**
   * Cập nhật trạng thái cơ bản của đơn hàng
   */
  async updateStatus(orderId: string, status: OrderStatus) {
    return this.update(orderId, { status });
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

  /**
   * Đếm tổng số lượng đơn hàng trên toàn hệ thống (Dành cho Admin Stats)
   */
  async countTotalOrders() {
    return this.count();
  }

  /**
   * Tính tổng doanh thu hệ thống từ các đơn hàng đã hoàn tất thanh toán
   */
  async calculateTotalRevenue() {
    const result = await (this.client as PrismaClient).orderGroup.aggregate({
      _sum: { totalAmount: true },
      where: { paymentStatus: PaymentStatus.COMPLETED },
    });
    return Number(result._sum.totalAmount ?? 0);
  }

  /**
   * Truy vấn danh sách đơn hàng dành cho giao diện quản trị (Admin Dashboard)
   * Bao gồm thông tin Shop, User và các sản phẩm đã mua
   */
  async findOrdersForAdmin(queryInput: GetOrdersQuery) {
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

  /**
   * Lấy danh sách trạng thái của tất cả đơn hàng con trong một nhóm
   */
  async findStatusesByGroupId(orderGroupId: string) {
    return this.findAll({ orderGroupId }, { select: { status: true } });
  }
}
