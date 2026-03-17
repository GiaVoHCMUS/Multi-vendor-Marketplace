import { prisma } from '@/core/config/prisma';
import { AppError } from '@/shared/utils/AppError';
import { PaginationQuery } from './admin.type';
import { buildPagination } from '@/shared/utils/pagination';
import { buildOffsetMeta } from '@/shared/utils/buildMeta';
import { MESSAGE } from '@/shared/constants/message.constants';

export const adminService = {
  async approveShop(shopId: string) {
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      throw new AppError(MESSAGE.ADMIN.SHOP_NOT_FOUND, 404);
    }

    if (shop.status === 'ACTIVE') {
      throw new AppError(MESSAGE.ADMIN.SHOP_ALREADY_APPROVED, 400);
    }

    return prisma.$transaction(async (tx) => {
      const updatedShop = await tx.shop.update({
        where: { id: shopId },
        data: {
          status: 'ACTIVE',
        },
      });

      await tx.user.update({
        where: { id: shop.ownerId },
        data: {
          role: 'SELLER',
        },
      });

      return updatedShop;
    });
  },

  async banShop(shopId: string) {
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      throw new AppError(MESSAGE.ADMIN.SHOP_NOT_FOUND, 404);
    }

    return prisma.shop.update({
      where: { id: shopId },
      data: {
        status: 'BANNED',
      },
    });
  },

  async banUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(MESSAGE.ADMIN.USER_NOT_FOUND, 404);
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
      },
    });
  },

  async getStats() {
    const [totalUsers, totalShops, totalOrders, totalRevenue] =
      await Promise.all([
        prisma.user.count({
          where: { deletedAt: null },
        }),

        prisma.shop.count({
          where: { deletedAt: null },
        }),

        prisma.order.count(),

        prisma.orderGroup.aggregate({
          _sum: {
            totalAmount: true,
          },
          where: {
            paymentStatus: 'COMPLETED',
          },
        }),
      ]);

    return {
      totalUsers,
      totalShops,
      totalOrders,
      totalRevenue: totalRevenue._sum.totalAmount ?? 0,
    };
  },

  async getPendingShops({ page, limit }: PaginationQuery) {
    const pagination = buildPagination({ page, limit });

    const [shops, total] = await Promise.all([
      prisma.shop.findMany({
        where: {
          status: 'PENDING',
          deletedAt: null,
        },

        include: {
          owner: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },

        skip: pagination.skip,
        take: pagination.take,

        orderBy: {
          createdAt: 'desc',
        },
      }),

      prisma.shop.count({
        where: {
          status: 'PENDING',
          deletedAt: null,
        },
      }),
    ]);

    return {
      data: shops,
      meta: buildOffsetMeta(pagination.page!, pagination.take, total),
    };
  },

  async getUsers(query: any) {
    const pagination = buildPagination(query);

    const where: any = {
      deletedAt: null,
    };

    if (query.search) {
      where.OR = [
        {
          email: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          fullName: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,

        skip: pagination.skip,
        take: pagination.take,

        orderBy: {
          createdAt: 'desc',
        },
      }),

      prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: buildOffsetMeta(pagination.page!, pagination.take, total),
    };
  },

  async getOrders(query: any) {
    const pagination = buildPagination(query);

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,

        include: {
          shop: {
            select: {
              id: true,
              name: true,
            },
          },

          orderGroup: {
            select: {
              userId: true,
              paymentStatus: true,
            },
          },

          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },

        skip: pagination.skip,
        take: pagination.take,

        orderBy: {
          createdAt: 'desc',
        },
      }),

      prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: buildOffsetMeta(pagination.page!, pagination.take, total),
    };
  },
};
