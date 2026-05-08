import { RegisterShopInput, UpdateMyShopInput } from './shop.type';
import { ImageType } from '@/shared/types/image.type';
import { slugHelper } from '@/shared/utils/slug';
import { MESSAGE } from '@/shared/constants/message.constants';
import { StatusCodes } from 'http-status-codes';
import { ShopRepository } from './shop.repository';
import { AppError } from '@/shared/utils/AppError';

export class ShopService {
  constructor(private readonly shopRepo: ShopRepository) {}

  async getShopByOwner(ownerId: string) {
    const shop = await this.shopRepo.findShopByOwerId(ownerId);

    if (!shop) {
      throw new AppError(MESSAGE.SHOP.NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    return shop;
  }

  async register(userId: string, data: RegisterShopInput, logoUrl?: ImageType) {
    const existingShop = await this.shopRepo.findShopByOwerId(userId);

    if (existingShop) {
      throw new AppError(MESSAGE.SHOP.ALREADY_REGISTERED, StatusCodes.BAD_REQUEST);
    }

    const shop = await this.shopRepo.createShop(userId, data, logoUrl);

    return shop;
  }

  async getMyShop(ownerId: string) {
    return this.getShopByOwner(ownerId);
  }

  async updateMyShop(ownerId: string, data: UpdateMyShopInput, logoUrl?: ImageType) {
    const shop = await this.getShopByOwner(ownerId);

    const updateData = {
      ...data,
      slug: data.name ? slugHelper.generate(data.name) : shop.slug,
      logoUrl: logoUrl?.url ?? shop.logoUrl,
      logoPublicId: logoUrl?.publicId ?? shop.logoPublicId,
    };

    return this.shopRepo.updateMyShop(shop.id, updateData);
  }
}
