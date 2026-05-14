import { BaseRepository } from '@/shared/repositories/base.repository';
import { ImageType } from '@/shared/types/image.type';
import { slugHelper } from '@/shared/utils/slug';
import { Prisma, PrismaClient, Shop, ShopStatus } from '@prisma/client';
import { RegisterShopInput } from './shop.type';
import { PrismaQueryHelper } from '@/shared/query/prisma-query.helper';
import { PaginationQuery } from '../admin/admin.type';

// Định nghĩa Type Shop kèm Owner bằng GetPayload của Prisma
export type ShopWithOwner = Prisma.ShopGetPayload<{
  include: {
    owner: {
      select: { email: true; fullName: true };
    };
  };
}>;

export class ShopRepository extends BaseRepository<
  Shop,
  Prisma.ShopCreateInput | Prisma.ShopUncheckedCreateInput,
  Prisma.ShopUpdateInput,
  Prisma.ShopFindManyArgs,
  Prisma.ShopWhereInput
> {
  constructor() {
    super('shop');
  }

  // Định nghĩa các trường mặc định muốn trả về cho Shop để dùng chung
  private readonly shopSelect = {
    id: true,
    ownerId: true,
    name: true,
    slug: true,
    description: true,
    logoUrl: true,
    status: true,
    balance: true,
  };

  async findShopByOwerId(ownerId: string) {
    return this.findOne({ ownerId, deletedAt: null }, { select: this.shopSelect });
  }

  async createShop(userId: string, data: RegisterShopInput, logoUrl?: ImageType) {
    return this.create(
      {
        ...data,
        logoUrl: logoUrl?.url,
        logoPublicId: logoUrl?.publicId,
        ownerId: userId,
        slug: slugHelper.generate(data.name),
        description: data.description ?? '',
        status: ShopStatus.PENDING,
      },
      { select: this.shopSelect },
    );
  }

  async findShopBySlug(shopSlug: string) {
    return this.findOne({ slug: shopSlug }, { select: this.shopSelect });
  }

  async updateMyShop(shopId: string, data: Prisma.ShopUpdateInput) {
    return this.update(shopId, data, { select: { ...this.shopSelect, logoPublicId: true } });
  }

  async findShopWithOwner(shopId: string) {
    return (await this.findById(shopId, {
      include: { owner: { select: { email: true, fullName: true } } },
    })) as ShopWithOwner | null;
  }

  async updateShopStatus(shopId: string, status: ShopStatus) {
    return this.update(shopId, { status }, { select: this.shopSelect });
  }

  async countActiveShops() {
    return this.count({ deletedAt: null });
  }

  async findPendingShops(queryInput: PaginationQuery) {
    const queryHelper = new PrismaQueryHelper(queryInput)
      .paginate()
      .applyFilter(() => ({
        status: ShopStatus.PENDING,
        deletedAt: null,
      }))
      .sort();

    const { prismaArgs, meta } = queryHelper.build();
    const prismaShop = (this.client as PrismaClient).shop;

    const [shops, total] = await Promise.all([
      prismaShop.findMany({
        ...prismaArgs,
        include: {
          owner: { select: { id: true, email: true, fullName: true } },
        },
        orderBy: prismaArgs.orderBy ?? { createdAt: 'desc' },
      }),
      prismaShop.count({ where: prismaArgs.where }),
    ]);

    return { shops, total, meta };
  }

  /**
   * Cộng thêm tiền vào số dư của Shop sau khi hoàn tất đơn hàng
   */
  async incrementBalance(shopId: string, amount: number) {
    return this.update(shopId, { balance: { increment: amount } }, { select: this.shopSelect });
  }
}
