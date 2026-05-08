import { AppError } from '@/shared/utils/AppError';
import { PaginationQuery } from './admin.type';
import { buildOffsetMeta } from '@/shared/utils/buildMeta';
import { MESSAGE } from '@/shared/constants/message.constants';
import { ShopStatus } from '@prisma/client';
import { cacheService } from '@/shared/services/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '@/shared/constants/cache.constants';
import { mailJob } from '@/jobs/mail/mail.job';
import { StatusCodes } from 'http-status-codes';
import { ShopRepository } from '../shop/shop.repository';
import { UserRepository } from '../user/user.repository';
import { OrderRepository } from '../order/order.repository';

export class AdminService {
  constructor(
    private readonly shopRepo: ShopRepository,
    private readonly userRepo: UserRepository,
    private readonly orderRepo: OrderRepository,
  ) {}

  async approveShop(shopId: string) {
    const shop = await this.shopRepo.findShopWithOwner(shopId);

    if (!shop) {
      throw new AppError(MESSAGE.ADMIN.SHOP_NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    if (shop.status === ShopStatus.ACTIVE) {
      throw new AppError(MESSAGE.ADMIN.SHOP_ALREADY_APPROVED, StatusCodes.BAD_REQUEST);
    }

    const updatedShop = await this.shopRepo.approveShopTransaction(shopId, shop.ownerId);

    await mailJob.sendShopApproval({
      to: shop.owner.email,
      ownerName: shop.owner.fullName,
      shopName: shop.name,
    });

    return updatedShop;
  }

  async banShop(shopId: string) {
    const shop = await this.shopRepo.findShopWithOwner(shopId);

    if (!shop) {
      throw new AppError(MESSAGE.ADMIN.SHOP_NOT_FOUND, StatusCodes.NOT_FOUND);
    }
    const updatedShop = await this.shopRepo.updateShopStatus(shopId, ShopStatus.BANNED);

    await mailJob.sendBannedApproval({
      to: shop.owner.email,
      ownerName: shop.owner.fullName,
      shopName: shop.name,
      reason: 'Vi phạm chính sách kinh doanh',
    });

    return updatedShop;
  }

  async banUser(userId: string) {
    const user = await this.userRepo.getProfileById(userId);

    if (!user) {
      throw new AppError(MESSAGE.ADMIN.USER_NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    return this.userRepo.softDeleteUser(userId);
  }

  async getStats() {
    return cacheService.getOrSet(
      CACHE_KEYS.ADMIN.DASHBOARD,
      async () => {
        const [totalUsers, totalShops, totalOrders, totalRevenue] = await Promise.all([
          this.userRepo.countActiveUsers(),
          this.shopRepo.countActiveShops(),
          this.orderRepo.countTotalOrders(),
          this.orderRepo.calculateTotalRevenue(),
        ]);

        return { totalUsers, totalShops, totalOrders, totalRevenue };
      },
      CACHE_TTL.TINY,
    );
  }

  async getPendingShops(queryInput: PaginationQuery) {
    const { shops, total, meta } = await this.shopRepo.findPendingShops(queryInput);

    if (!meta || meta.type !== 'offset') {
      throw new AppError('Phân trang không hợp lệ', StatusCodes.BAD_REQUEST);
    }

    return {
      data: shops,
      meta: buildOffsetMeta({
        totalItems: total,
        page: meta.page,
        limit: meta.limit,
      }),
    };
  }

  async getUsers(queryInput: any) {
    const { users, total, meta } = await this.userRepo.findUsersForAdmin(queryInput);

    if (!meta || meta.type !== 'offset') {
      throw new AppError('Phân trang không hợp lệ', StatusCodes.BAD_REQUEST);
    }

    return {
      data: users,
      meta: buildOffsetMeta({
        totalItems: total,
        page: meta.page,
        limit: meta.limit,
      }),
    };
  }

  async getOrders(queryInput: any) {
    const { orders, total, meta } = await this.orderRepo.findOrdersForAdmin(queryInput);

    if (!meta || meta.type !== 'offset') {
      throw new AppError('Phân trang không hợp lệ', StatusCodes.BAD_REQUEST);
    }

    return {
      data: orders,
      meta: buildOffsetMeta({
        totalItems: total,
        page: meta.page,
        limit: meta.limit,
      }),
    };
  }
}
