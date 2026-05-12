import { CreateAddressInput, UpdateAddressInput, UpdateMeInput } from './user.type';
import { ImageType } from '@/shared/types/image.type';
import { AppError } from '@/shared/utils/AppError';
import { MESSAGE } from '@/shared/constants/message.constants';
import { cacheService } from '@/shared/services/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '@/shared/constants/cache.constants';
import { StatusCodes } from 'http-status-codes';
import { UserRepository } from './user.repository';
import { AddressRepository } from './address.repository';

export class UserService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly addressRepo: AddressRepository,
  ) {}
  async getMe(userId: string) {
    return await this.userRepo.getProfileById(userId);
  }

  async updateMe(userId: string, data: UpdateMeInput, file?: ImageType) {
    return this.userRepo.updateUser(userId, {
      ...data,
      avatarUrl: file?.url,
      avatarPublicId: file?.publicId,
    });
  }

  async getAddresses(userId: string) {
    const cacheKey = CACHE_KEYS.USER.ADDRESS_LIST(userId);

    return cacheService.getOrSet(
      cacheKey,
      async () => this.addressRepo.getUserAddress(userId),
      CACHE_TTL.MEDIUM,
    );
  }

  async createAddress(userId: string, data: CreateAddressInput) {
    // Tạo địa chỉ mới
    if (data.isDefault) {
      await this.addressRepo.clearDefaultStatus(userId);
    }

    const address = await this.addressRepo.createAddress(userId, data);

    await cacheService.delete(CACHE_KEYS.USER.ADDRESS_LIST(userId));

    return address;
  }

  async updateAddress(userId: string, addressId: string, data: UpdateAddressInput) {
    // Cập nhật địa chỉ
    const address = await this.addressRepo.findAddressByUserId(addressId, userId);

    if (!address) {
      throw new AppError(MESSAGE.USER.ADDRESS_NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    if (data.isDefault) {
      await this.addressRepo.clearDefaultStatus(userId);
    }

    await cacheService.delete(CACHE_KEYS.USER.ADDRESS_LIST(userId));

    return this.addressRepo.updateAddressById(addressId, data);
  }

  async deleteAddress(userId: string, addressId: string) {
    // Xóa địa chỉ
    const address = await this.addressRepo.findAddressByUserId(addressId, userId);

    if (!address) {
      throw new AppError(MESSAGE.USER.ADDRESS_NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    await cacheService.delete(CACHE_KEYS.USER.ADDRESS_LIST(userId));

    return this.addressRepo.deleteAddress(addressId);
  }
}
