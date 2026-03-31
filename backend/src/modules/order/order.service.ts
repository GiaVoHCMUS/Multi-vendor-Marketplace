import { redisClient } from '@/core/cache/redis';
import { CheckoutInput } from './order.type';
import { AppError } from '@/shared/utils/AppError';
import { prisma } from '@/core/config/prisma';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PayoutStatus,
  ProductStatus,
  TransactionType,
} from '@prisma/client';
import { MESSAGE } from '@/shared/constants/message.constants';
import { PrismaQueryHelper } from '@/shared/query/prisma-query.helper';
import { buildOffsetMeta } from '@/shared/utils/buildMeta';
import { mailJob } from '@/jobs/mail/mail.job';
import { checkAndCompleteOrderGroup } from './order.helper';

const redis = redisClient.getInstance();

const getCartKey = (userId: string) => `cart:${userId}`;

export const orderService = {
  async checkout(userId: string, data: CheckoutInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        fullName: true,
      },
    });
    if (!user) {
      throw new AppError(MESSAGE.USER.NOT_FOUND, 404);
    }

    const cart = await redis.hGetAll(getCartKey(userId));

    if (!cart || Object.keys(cart).length === 0) {
      throw new AppError('Giỏ hàng rỗng', 400);
    }

    const items = Object.entries(cart).map(([productId, quantity]) => ({
      productId,
      quantity: Number(quantity),
    }));

    const productIds = items.map((i) => i.productId);

    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        deletedAt: null,
        status: ProductStatus.PUBLISHED,
      },
    });

    if (products.length !== items.length) {
      throw new AppError(MESSAGE.ORDER.INVALID_PRODUCTS, 400);
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    let totalAmount: number = 0;

    const orderItems = items.map((item) => {
      const product = productMap.get(item.productId)!;

      if (item.quantity > product.stock) {
        throw new AppError(MESSAGE.ORDER.INSUFFICIENT_STOCK, 400);
      }

      const price = Number(product.price);

      totalAmount += price * item.quantity;

      return {
        product,
        quantity: item.quantity,
        price,
      };
    });

    // Group theo shop
    const shopMap = new Map<string, any>();

    for (const item of orderItems) {
      const shopId = item.product.shopId;
      if (!shopMap.has(shopId)) {
        shopMap.set(shopId, []);
      }

      shopMap.get(shopId).push(item);
    }

    const result = await prisma.$transaction(async (tx) => {
      const orderGroup = await tx.orderGroup.create({
        data: {
          userId,
          totalAmount,
          paymentMethod: data.paymentMethod,
          shippingName: data.shippingName,
          shippingPhone: data.shippingPhone,
          shippingAddress: data.shippingAddress,
        },
      });

      for (const [shopId, items] of shopMap) {
        const shopTotal: number = items.reduce(
          (sum: number, item) => sum + item.price * item.quantity,
          0,
        );

        const order = await tx.order.create({
          data: {
            orderGroupId: orderGroup.id,
            shopId,
            totalAmount: shopTotal,
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
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }
      }

      return orderGroup;
    });

    await redis.del(getCartKey(userId));
    await mailJob.sendOrderConfirmation({
      to: user.email,
      customerName: user.fullName,
      orderId: result.id,
      totalAmount,
    });

    return result;
  },

  // Xem danh sách toàn bộ đơn hàng
  async getMyOrders(userId: string, query: any) {
    const { prismaArgs, meta } = new PrismaQueryHelper(query)
      .paginate()
      .applyFilter((q) => ({
        ...(q.status && { status: q.status }),
        orderGroup: { userId },
      }))
      .sort()
      .build();

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        ...prismaArgs,
        include: {
          shop: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  price: true,
                  images: {
                    take: 1,
                  },
                },
              },
            },
          },
          orderGroup: {
            select: {
              paymentStatus: true,
              paymentMethod: true,
              createdAt: true,
            },
          },
        },
        orderBy: prismaArgs.orderBy ?? { createdAt: 'desc' },
      }),

      prisma.order.count({ where: prismaArgs.where }),
    ]);

    if (!meta || meta.type !== 'offset') {
      throw new AppError('Phân trang không hợp lệ', 400);
    }

    return {
      data: orders,
      meta: buildOffsetMeta({
        totalItems: total,
        page: meta.page,
        limit: meta.limit,
      }),
    };
  },

  // Xem chi tiết từng đơn hàng
  async getOrderDetail(userId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        orderGroup: { userId },
      },

      select: {
        id: true,
        orderGroupId: true,
        shopId: true,
        totalAmount: true,
        status: true,

        shop: true,

        orderItems: {
          include: {
            product: {
              include: {
                images: true,
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

            createdAt: true,
          },
        },

        transactions: true,
      },
    });

    if (!order) {
      throw new AppError(MESSAGE.ORDER.NOT_FOUND, 404);
    }

    return order;
  },

  async updateOrderStatus(
    orderId: string,
    nextStatus: OrderStatus, // Trạng thái đơn hàng mà Seller muốn cập nhật
    sellerId: string,
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shop: true,
        orderGroup: true,
        orderItems: true,
      },
    });

    if (!order) {
      throw new AppError(MESSAGE.ORDER.NOT_FOUND, 404);
    }

    // Kiểm tra quyền seller
    if (order.shop.ownerId !== sellerId) {
      throw new AppError(MESSAGE.ORDER.FORBIDDEN_UPDATE_STATUS, 403);
    }

    // State machine: PENDING -> CONFIRMED -> SHIPPING -> DELIVERED -> CANCELLED
    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      CONFIRMED: [OrderStatus.SHIPPING, OrderStatus.CANCELLED],
      SHIPPING: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      DELIVERED: [],
      CANCELLED: [],
    };

    if (!allowedTransitions[order.status].includes(nextStatus)) {
      throw new AppError(
        `Thay đổi trạng thái không hợp lệ ${order.status} -> ${nextStatus}`,
        400,
      );
    }

    // Transaction: update status + payout logic
    return prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: nextStatus },
      });

      if (nextStatus === OrderStatus.CANCELLED) {
        for (const item of order.orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
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

      if (
        nextStatus === OrderStatus.DELIVERED &&
        order.orderGroup.paymentMethod === PaymentMethod.COD
      ) {
        // Update payoutStatus
        await tx.order.update({
          where: { id: orderId },
          data: {
            payoutStatus: PayoutStatus.PAID_OUT,
            payoutAt: new Date(),
          },
        });

        // Tăng balance cho shop
        await tx.shop.update({
          where: { id: order.shopId },
          data: {
            balance: {
              increment: Number(order.totalAmount),
            },
          },
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
        await checkAndCompleteOrderGroup(order.orderGroupId);
      }

      return updatedOrder;
    });
  },
};
