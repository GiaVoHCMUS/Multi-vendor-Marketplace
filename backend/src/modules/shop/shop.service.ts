import { OrderStatus, ShopStatus } from '@prisma/client';
import { RegisterShopInput, UpdateMyShopInput } from './shop.type';
import { ImageType } from '@/shared/types/image.type';
import { prisma } from '@/core/config/prisma';
import { AppError } from '@/shared/utils/AppError';
import { slug } from '@/shared/utils/slug';
import { MESSAGE } from '@/shared/constants/message.constants';
import { PrismaQueryHelper } from '@/shared/query/prisma-query.helper';
import { buildOffsetMeta } from '@/shared/utils/buildMeta';
import { CACHE_KEYS, CACHE_TTL } from '@/shared/constants/cache.constants';
import { cacheService } from '@/core/cache/cache.service';

export const shopService = {
  async getShopByOwner(ownerId: string) {
    const shop = await prisma.shop.findFirst({
      where: {
        ownerId,
        deletedAt: null,
      },
    });

    if (!shop) {
      throw new AppError(MESSAGE.SHOP.NOT_FOUND, 404);
    }

    return shop;
  },

  async register(userId: string, data: RegisterShopInput, logoUrl?: ImageType) {
    const existingShop = await prisma.shop.findFirst({
      where: {
        ownerId: userId,
        deletedAt: null,
      },
    });

    if (existingShop) {
      throw new AppError(MESSAGE.SHOP.ALREADY_REGISTERED, 400);
    }

    const shop = await prisma.shop.create({
      data: {
        name: data.name,
        slug: slug.generate(data.name),
        description: data.description ?? '',
        ownerId: userId,
        logoUrl: logoUrl?.url,
        logoPublicId: logoUrl?.publicId,
        status: ShopStatus.PENDING,
      },
    });

    return shop;
  },

  async getMyShop(ownerId: string) {
    const shop = await shopService.getShopByOwner(ownerId);

    return shop;
  },

  async updateMyShop(
    ownerId: string,
    data: UpdateMyShopInput,
    logoUrl?: ImageType,
  ) {
    const shop = await shopService.getShopByOwner(ownerId);

    const updatedShop = await prisma.shop.update({
      where: { id: shop.id },
      data: {
        name: data.name ?? shop.name,
        slug: data.name ? slug.generate(data.name) : shop.slug,
        description: data.description ?? shop.description,
        logoUrl: logoUrl?.url ?? shop.logoUrl,
        logoPublicId: logoUrl?.publicId ?? shop.logoPublicId,
      },
    });

    return updatedShop;
  },

  async getShopOrders(ownerId: string, query: any) {
    const shop = await shopService.getShopByOwner(ownerId);

    const { prismaArgs, meta } = new PrismaQueryHelper(query)
      .paginate()
      .applyFilter((q) => ({
        shopId: shop.id,
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
      .build();

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        ...prismaArgs,
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
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

  async updateOrderStatus(
    ownerId: string,
    orderId: string,
    status: OrderStatus,
  ) {
    const shop = await shopService.getShopByOwner(ownerId);

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        shopId: shop.id,
      },
    });

    if (!order) {
      throw new AppError(MESSAGE.SHOP.ORDER_NOT_FOUND, 404);
    }

    if (order.status === OrderStatus.DELIVERED) {
      throw new AppError(MESSAGE.SHOP.ORDER_ALREADY_DELIVERED, 400);
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
      },
    });

    return updatedOrder;
  },

  async getShopAnalytics(ownerId: string) {
    const shop = await shopService.getShopByOwner(ownerId);

    const cacheKey = CACHE_KEYS.SHOP.ANALYTICS(shop.id);

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const [totalOrders, deliveredOrders, revenue] = await Promise.all([
          prisma.order.count({
            where: { shopId: shop.id },
          }),

          prisma.order.count({
            where: {
              shopId: shop.id,
              status: OrderStatus.DELIVERED,
            },
          }),

          prisma.order.aggregate({
            where: {
              shopId: shop.id,
              status: OrderStatus.DELIVERED,
            },
            _sum: {
              totalAmount: true,
            },
          }),
        ]);

        return {
          totalOrders,
          deliveredOrders,
          revenue: revenue._sum.totalAmount ?? 0,
        };
      },
      CACHE_TTL.TINY,
    );
  },
};
