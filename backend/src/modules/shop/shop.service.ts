import { OrderStatus } from '@prisma/client';
import { RegisterShopInput, UpdateMyShopInput } from './shop.type';
import { ImageType } from '@/shared/types/image.type';
import { prisma } from '@/core/config/prisma';
import { AppError } from '@/shared/utils/AppError';
import { slug } from '@/shared/utils/slug';
import { MESSAGE } from '@/shared/constants/message.constants';

export const shopService = {
  getShopByOwner: async (ownerId: string) => {
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

  register: async (
    userId: string,
    data: RegisterShopInput,
    logoUrl?: ImageType,
  ) => {
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
        status: 'PENDING',
      },
    });

    return shop;
  },

  getMyShop: async (ownerId: string) => {
    const shop = await shopService.getShopByOwner(ownerId);

    return shop;
  },

  updateMyShop: async (
    ownerId: string,
    data: UpdateMyShopInput,
    logoUrl?: ImageType,
  ) => {
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

  getShopOrders: async (
    ownerId: string,
    cursor?: string,
    limit: number = 10,
  ) => {
    const shop = await shopService.getShopByOwner(ownerId);

    const orders = await prisma.order.findMany({
      where: { shopId: shop.id },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    let nextCursor: string | null = null;
    if (orders.length > limit) {
      const nextItem = orders.pop();
      nextCursor = nextItem!.id;
    }

    return {
      data: orders,
      meta: {
        nextCursor,
        limit,
      },
    };
  },

  updateOrderStatus: async (
    ownerId: string,
    orderId: string,
    status: OrderStatus,
  ) => {
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

    if (order.status === 'DELIVERED') {
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

  getShopAnalytics: async (ownerId: string) => {
    const shop = await shopService.getShopByOwner(ownerId);

    const [totalOrders, deliveredOrders, revenue] = await Promise.all([
      prisma.order.count({
        where: { shopId: shop.id },
      }),

      prisma.order.count({
        where: {
          shopId: shop.id,
          status: 'DELIVERED',
        },
      }),

      prisma.order.aggregate({
        where: {
          shopId: shop.id,
          status: 'DELIVERED',
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
};
