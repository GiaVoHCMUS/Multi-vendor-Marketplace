import { CreateAddressInput, UpdateAddressInput, UpdateMeInput } from './user.type';
import { ImageType } from '@/shared/types/image.type';
import { AppError } from '@/shared/utils/AppError';
import { MESSAGE } from '@/shared/constants/message.constants';
import { cacheService } from '@/shared/services/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '@/shared/constants/cache.constants';
import { StatusCodes } from 'http-status-codes';
import { userRepository } from './user.repository';
import { addressRepository } from './address.repository';

export const userService = {
  getMe: async (userId: string) => {
    // Lấy thông tin cá nhân
    return userRepository.getProfileById(userId);
  },

  updateMe: async (userId: string, data: UpdateMeInput, file?: ImageType) => {
    // Cập nhật thông tin
    return userRepository.updateUser(userId, {
      ...data,
      avatarUrl: file?.url,
      avatarPublicId: file?.publicId,
    });
  },

  getAddresses: async (userId: string) => {
    const cacheKey = CACHE_KEYS.USER.ADDRESS_LIST(userId);

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        return addressRepository.getUserAddress(userId);
      },
      CACHE_TTL.MEDIUM,
    );
  },

  createAddress: async (userId: string, data: CreateAddressInput) => {
    // Tạo địa chỉ mới
    if (data.isDefault) {
      await addressRepository.clearDefaultStatus(userId);
    }

    const address = await addressRepository.createAddress(userId, data);

    await cacheService.delete(CACHE_KEYS.USER.ADDRESS_LIST(userId));

    return address;
  },

  updateAddress: async (userId: string, addressId: string, data: UpdateAddressInput) => {
    // Cập nhật địa chỉ
    const address = await addressRepository.findAddressByUserId(addressId, userId);

    if (!address) {
      throw new AppError(MESSAGE.USER.ADDRESS_NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    if (data.isDefault) {
      await addressRepository.clearDefaultStatus(userId);
    }

    await cacheService.delete(CACHE_KEYS.USER.ADDRESS_LIST(userId));

    return addressRepository.updateAddressById(addressId, data);
  },

  deleteAddress: async (userId: string, addressId: string) => {
    // Xóa địa chỉ
    const address = await addressRepository.findAddressByUserId(addressId, userId);

    if (!address) {
      throw new AppError(MESSAGE.USER.ADDRESS_NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    await cacheService.delete(CACHE_KEYS.USER.ADDRESS_LIST(userId));

    return addressRepository.deleteAddress(addressId);
  },
};
