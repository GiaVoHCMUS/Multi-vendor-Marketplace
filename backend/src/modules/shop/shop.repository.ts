import { BaseRepository } from '@/shared/repositories/base.repository';
import { ImageType } from '@/shared/types/image.type';
import { slugHelper } from '@/shared/utils/slug';
import { Prisma, Shop, ShopStatus } from '@prisma/client';
import { RegisterShopInput } from './shop.type';

class ShopRepository extends BaseRepository<
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
    return this.findOne(
      { ownerId, deletedAt: null },
      { omit: { deletedAt: true, createdAt: true, updatedAt: true, logoPublicId: true } },
    );
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
      {
        omit: {
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          logoPublicId: true,
        },
      },
    );
  }

  async findShopBySlug(shopSlug: string) {
    return this.findOne(
      { slug: shopSlug },
      {
        select: this.shopSelect,
      },
    );
  }

  async updateMyShop(shopId: string, data: Prisma.ShopUpdateInput) {
    return this.update(shopId, data, {
      omit: {
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        logoPublicId: true,
      },
    });
  }

  async findShopWithOwner(shopId: string) {
    return this.findById(shopId, {
      include: {
        owner: {
          select: {
            email: true,
            fullName: true,
          },
        },
      },
    });
  }
}

export const shopRepository = new ShopRepository();
