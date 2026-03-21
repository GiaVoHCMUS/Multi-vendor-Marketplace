import { redisClient } from '@/core/cache/redis';
import { CheckoutInput } from './order.type';
import { AppError } from '@/shared/utils/AppError';
import { prisma } from '@/core/config/prisma';
import { OrderStatus, ProductStatus } from '@prisma/client';
import { MESSAGE } from '@/shared/constants/message.constants';
import { PrismaQueryHelper } from '@/shared/query/prisma-query.helper';
import { buildOffsetMeta } from '@/shared/utils/buildMeta';

const redis = redisClient.getInstance();

const getCartKey = (userId: string) => `cart:${userId}`;

export const orderService = {
  async checkout(userId: string, data: CheckoutInput) {
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

    return result;
  },

  // async getMyOrders(userId: string) {
  //   return prisma.order.findMany({
  //     where: { orderGroup: { userId } },

  //     include: {
  //       shop: {
  //         select: {
  //           id: true,
  //           name: true,
  //           slug: true,
  //         },
  //       },

  //       orderItems: {
  //         include: {
  //           product: {
  //             select: {
  //               id: true,
  //               name: true,
  //               slug: true,
  //               price: true,
  //               images: {
  //                 take: 1,
  //               },
  //             },
  //           },
  //         },
  //       },

  //       orderGroup: {
  //         select: {
  //           paymentStatus: true,
  //           paymentMethod: true,
  //           createdAt: true,
  //         },
  //       },
  //     },

  //     orderBy: {
  //       createdAt: 'desc',
  //     },
  //   });
  // },

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

  async getOrderDetail(userId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        orderGroup: { userId },
      },

      include: {
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
      },
    });

    if (!order) {
      throw new AppError(MESSAGE.ORDER.NOT_FOUND, 404);
    }

    return order;
  },

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    sellerId: string,
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shop: true,
      },
    });

    if (!order) {
      throw new AppError(MESSAGE.ORDER.NOT_FOUND, 404);
    }

    if (order.shop.ownerId !== sellerId) {
      throw new AppError(MESSAGE.ORDER.FORBIDDEN_UPDATE_STATUS, 403);
    }

    return prisma.order.update({
      where: { id: orderId },
      data: { status },
    });
  },
};
