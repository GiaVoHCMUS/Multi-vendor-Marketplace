import { prisma } from '@/core/config/prisma';
import { AppError } from '@/shared/utils/AppError';
import { PaginationQuery } from './admin.type';
import { buildOffsetMeta } from '@/shared/utils/buildMeta';
import { MESSAGE } from '@/shared/constants/message.constants';
import { PrismaQueryHelper } from '@/shared/query/prisma-query.helper';
import { ShopStatus } from '@prisma/client';
import { cacheService } from '@/core/cache/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '@/shared/constants/cache.constants';
import { mailJob } from '@/jobs/mail/mail.job';

export const adminService = {
  async approveShop(shopId: string) {
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        owner: {
          select: {
            email: true,
            fullName: true,
          },
        },
      },
    });

    if (!shop) {
      throw new AppError(MESSAGE.ADMIN.SHOP_NOT_FOUND, 404);
    }

    if (shop.status === 'ACTIVE') {
      throw new AppError(MESSAGE.ADMIN.SHOP_ALREADY_APPROVED, 400);
    }

    const updatedShop = prisma.$transaction(async (tx) => {
      const updated = await tx.shop.update({
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

      return updated;
    });

    await mailJob.sendShopApproval({
      to: shop.owner.email,
      ownerName: shop.owner.fullName,
      shopName: shop.name,
    });

    return updatedShop;
  },

  async banShop(shopId: string) {
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        owner: {
          select: {
            email: true,
            fullName: true,
          },
        },
      },
    });

    if (!shop) {
      throw new AppError(MESSAGE.ADMIN.SHOP_NOT_FOUND, 404);
    }
    const updatedShop = prisma.shop.update({
      where: { id: shopId },
      data: {
        status: 'BANNED',
      },
    });

    await mailJob.sendBannedApproval({
      to: shop.owner.email,
      ownerName: shop.owner.fullName,
      shopName: shop.name,
      reason: 'Vi phạm chính sách kinh doanh',
    });

    return updatedShop;
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
    return cacheService.getOrSet(
      CACHE_KEYS.ADMIN.DASHBOARD,
      async () => {
        const [totalUsers, totalShops, totalOrders, totalRevenue] =
          await Promise.all([
            prisma.user.count({ where: { deletedAt: null } }),

            prisma.shop.count({ where: { deletedAt: null } }),

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
      CACHE_TTL.TINY,
    );
  },

  async getPendingShops({ page, limit }: PaginationQuery) {
    const { prismaArgs, meta } = new PrismaQueryHelper({ page, limit })
      .paginate()
      .applyFilter(() => ({
        status: ShopStatus.PENDING,
        deletedAt: null,
      }))
      .sort()
      .build();

    const [shops, total] = await Promise.all([
      prisma.shop.findMany({
        ...prismaArgs,
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      }),
      prisma.shop.count({
        where: prismaArgs.where,
      }),
    ]);

    if (!meta || meta.type !== 'offset') {
      throw new AppError('Phân trang không hợp lệ', 400);
    }

    return {
      data: shops,
      meta: buildOffsetMeta({
        totalItems: total,
        page: meta.page,
        limit: meta.limit,
      }),
    };
  },

  async getUsers(query: any) {
    const { prismaArgs, meta } = new PrismaQueryHelper(query)
      .paginate()
      .applyFilter((q) => ({
        deletedAt: null,
        ...(q.search && {
          OR: [
            {
              email: {
                contains: q.search,
                mode: 'insensitive',
              },
            },
            {
              fullName: {
                contains: q.search,
                mode: 'insensitive',
              },
            },
          ],
        }),
      }))
      .sort()
      .build();

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        ...prismaArgs,
        orderBy: prismaArgs.orderBy ?? { createdAt: 'desc' },
      }),
      prisma.user.count({
        where: prismaArgs.where,
      }),
    ]);

    if (!meta || meta.type !== 'offset') {
      throw new AppError('Phân trang không hợp lệ', 400);
    }

    return {
      data: users,
      meta: buildOffsetMeta({
        totalItems: total,
        page: meta.page,
        limit: meta.limit,
      }),
    };
  },

  async getOrders(query: any) {
    const { prismaArgs, meta } = new PrismaQueryHelper(query)
      .paginate()
      .applyFilter((q) => ({
        ...(q.status && { status: q.status }),
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
        orderBy: prismaArgs.orderBy ?? { createdAt: 'desc' },
      }),
      prisma.order.count({
        where: prismaArgs.where,
      }),
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
};
