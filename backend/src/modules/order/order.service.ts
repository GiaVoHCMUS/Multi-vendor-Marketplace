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
import { paymentService } from '../payment/payment.service';
import { CACHE_KEYS } from '@/shared/constants/cache.constants';

const redis = redisClient.getInstance();

const getCartKey = (userId: string) => `marketplace:cart:${userId}`;

export const orderService = {
  async checkout(userId: string, ipAddr: string, data: CheckoutInput) {
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

    const items = await redis.hGetAll(getCartKey(userId));

    const cartItems = Object.entries(items ?? {}).map(
      ([productId, quantity]) => ({
        productId,
        quantity: Number(quantity),
      }),
    );

    if (cartItems.length == 0) {
      throw new AppError('Giỏ hàng rỗng', 400);
    }

    const productIds = cartItems.map((i) => i.productId);

    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        deletedAt: null,
        status: ProductStatus.PUBLISHED,
      },
      select: {
        id: true,
        shopId: true,
        categoryId: true,
        name: true,
        slug: true,
        price: true,
        stock: true,
      },
    });

    if (products.length !== cartItems.length) {
      throw new AppError(MESSAGE.ORDER.INVALID_PRODUCTS, 400);
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    let totalAmount: number = 0;

    const orderItems = cartItems.map((item) => {
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

    // Group sản phẩm theo nhóm
    const shopMap = new Map<string, typeof orderItems>();

    for (const item of orderItems) {
      const shopId = item.product.shopId;
      if (!shopMap.has(shopId)) {
        shopMap.set(shopId, []);
      }

      shopMap.get(shopId)!.push(item);
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Lưu orderGroup vào database
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
        const shopTotal: number = items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        );

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

    // Invalidate cache
    const pipeline = redis.multi();
    products.forEach((product) =>
      pipeline.del(CACHE_KEYS.PRODUCT.SLUG(product.slug)),
    );
    pipeline.incr(CACHE_KEYS.PRODUCT.TRACKER_LIST);
    await pipeline.exec();

    if (data.paymentMethod === PaymentMethod.COD) {
      // COD -> xóa cart và gửi mail ngay
      await redis.del(getCartKey(userId));

      await mailJob.sendOrderConfirmation({
        to: user.email,
        customerName: user.fullName,
        orderId: result.id,
        totalAmount,
      });
      return { result, paymentUrl: null };
    }

    if (data.paymentMethod === PaymentMethod.VNPAY) {
      // VNPAY -> tạo payment URL (gọi payment service)
      const paymentUrl = await paymentService.createPayment({
        orderGroupId: result.id,
        provider: PaymentMethod.VNPAY,
        ipAddr,
      });

      return { result, paymentUrl };
    }
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
      SHIPPING: [OrderStatus.DELIVERED],
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

      // Nếu Seller cập nhật đơn hàng là đã bị hủy
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

      // Nếu Seller cập nhật đơn hàng là đã giao hàng thành công
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
        await checkAndCompleteOrderGroup(tx, order.orderGroupId);
      }

      return updatedOrder;
    });
  },
};
