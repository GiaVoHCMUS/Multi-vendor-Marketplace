import { prisma } from '@/core/config/prisma';
import {
  CreateAddressInput,
  UpdateAddressInput,
  UpdateMeInput,
} from './user.type';
import { ImageType } from '@/shared/types/image.type';
import { AppError } from '@/shared/utils/AppError';
import { MESSAGE } from '@/shared/constants/message.constants';
import { cacheService } from '@/core/cache/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '@/shared/constants/cache.constants';
import { StatusCodes } from 'http-status-codes';

export const userService = {
  getMe: async (userId: string) => {
    // Lấy thông tin cá nhân
    const user = await prisma.user.findUnique({
      where: { id: userId },
      omit: {
        createdAt: true,
        deletedAt: true,
        updatedAt: true,
        password: true,
      },
    });
    return user;
  },

  updateMe: async (userId: string, data: UpdateMeInput, file?: ImageType) => {
    // Cập nhật thông tin
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        avatarUrl: file?.url,
        avatarPublicId: file?.publicId,
      },
    });
    return user;
  },

  getAddresses: async (userId: string) => {
    const cacheKey = CACHE_KEYS.USER.ADDRESS_LIST(userId);

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        return prisma.address.findMany({
          where: { userId },
          orderBy: {
            createdAt: 'desc',
          },
        });
      },
      CACHE_TTL.MEDIUM,
    );
  },

  createAddress: async (userId: string, data: CreateAddressInput) => {
    // Tạo địa chỉ mới
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId,
        ...data,
      },
    });

    await cacheService.delete(CACHE_KEYS.USER.ADDRESS_LIST(userId));

    return address;
  },

  updateAddress: async (
    userId: string,
    addressId: string,
    data: UpdateAddressInput,
  ) => {
    // Cập nhật địa chỉ
    const address = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new AppError(MESSAGE.USER.ADDRESS_NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    await cacheService.delete(CACHE_KEYS.USER.ADDRESS_LIST(userId));

    return prisma.address.update({
      where: { id: addressId },
      data,
    });
  },

  deleteAddress: async (userId: string, addressId: string) => {
    // Xóa địa chỉ
    const address = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new AppError(MESSAGE.USER.ADDRESS_NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    await cacheService.delete(CACHE_KEYS.USER.ADDRESS_LIST(userId));

    return prisma.address.delete({
      where: { id: addressId },
    });
  },
};
