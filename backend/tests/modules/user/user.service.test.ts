import { userService } from '@/modules/user/user.service';
import { userRepository } from '@/modules/user/user.repository';
import { addressRepository } from '@/modules/user/address.repository';
import { UserRole } from '@prisma/client';
import { cacheService } from '@/core/cache/cache.service';
import { CACHE_KEYS } from '@/shared/constants/cache.constants';
import { AppError } from '@/shared/utils/AppError';
import { MESSAGE } from '@/shared/constants/message.constants';
import { StatusCodes } from 'http-status-codes';

jest.mock('@/modules/user/user.repository', () => ({
  userRepository: {
    getProfileById: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    updatePassword: jest.fn(),
    findByEmail: jest.fn(),
    markEmailAsVerified: jest.fn(),
  },
}));

jest.mock('@/modules/user/address.repository', () => ({
  addressRepository: {
    createAddress: jest.fn(),
    getUserAddress: jest.fn(),
    findAddressByUserId: jest.fn(),
    clearDefaultStatus: jest.fn(),
    updateAddressById: jest.fn(),
    deleteAddress: jest.fn(),
  },
}));

jest.mock('@/core/cache/cache.service', () => ({
  cacheService: {
    getOrSet: jest.fn((key, cb) => cb()), // Ép chạy callback để vào repository
    delete: jest.fn(),
  },
}));

describe('userService', () => {
  const addressId = 'address-01';
  const userId = 'user-01';
  const profile = {
    id: 'user-01',
    email: 'example@gmail.com',
    role: UserRole.USER,
    fullName: 'Example',
    avatarUrl: 'avatar',
    bio: 'biography',
  };

  describe('getMe()', () => {
    it('should get personal profile successfully', async () => {
      (userRepository.getProfileById as jest.Mock).mockResolvedValue(profile);

      const result = await userService.getMe(userId);

      expect(userRepository.getProfileById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(profile);
    });
  });

  describe('updateMe()', () => {
    it('should update personal profile including avatar', async () => {
      const fullName = 'New Name';
      const mockFile = { url: 'http://image.com', publicId: 'image.com' };

      (userRepository.updateUser as jest.Mock).mockResolvedValue({
        ...profile,
        fullName,
        avatarUrl: mockFile.url,
      });

      const result = await userService.updateMe(userId, { fullName }, mockFile);

      expect(result.fullName).toBe(fullName);
      expect(result.avatarUrl).toBe(mockFile.url);
      expect(userRepository.updateUser).toHaveBeenCalledWith(userId, {
        fullName,
        avatarUrl: mockFile.url,
        avatarPublicId: mockFile.publicId,
      });
    });
  });

  describe('getAddresses()', () => {
    it('should use cacheService to retrieve addresses', async () => {
      const mockAddresses = [{ id: addressId, city: 'Hanoi' }];
      (cacheService.getOrSet as jest.Mock).mockImplementation((key, cb) => cb());
      (addressRepository.getUserAddress as jest.Mock).mockResolvedValue(mockAddresses);

      const result = await userService.getAddresses(userId);

      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        CACHE_KEYS.USER.ADDRESS_LIST(userId),
        expect.any(Function),
        expect.any(Number),
      );
      expect(result).toEqual(mockAddresses);
    });
  });

  describe('createAddress()', () => {
    const newData = {
      receiverName: 'Test User',
      receiverPhone: '0847xxx',
      province: 'Thành Phố Hồ Chí Minh',
      ward: 'Phú Định',
      detailAddress: '15 Võ Văn Kiệt, Phường Phú Định, Thành Phố Hồ Chí Minh',
      isDefault: true,
    };
    it('should clear existing default addresses if new one is set as default', async () => {
      await userService.createAddress(userId, newData);

      expect(addressRepository.clearDefaultStatus).toHaveBeenCalledWith(userId);
      expect(addressRepository.createAddress).toHaveBeenCalledWith(userId, newData);
      expect(cacheService.delete).toHaveBeenCalledWith(CACHE_KEYS.USER.ADDRESS_LIST(userId));
    });

    it('should not clear default status if new address is not default', async () => {
      newData.isDefault = false;
      await userService.createAddress(userId, newData);

      expect(addressRepository.clearDefaultStatus).not.toHaveBeenCalled();
      expect(addressRepository.createAddress).toHaveBeenCalledWith(userId, newData);
      expect(cacheService.delete).toHaveBeenCalled();
    });
  });

  describe('updateAddress()', () => {
    const updateData = {
      receiverName: 'Test User',
      receiverPhone: '0847xxx',
      ward: 'Phú Định',
      detailAddress: '15 Võ Văn Kiệt, Phường Phú Định, Thành Phố Hồ Chí Minh',
      isDefault: true,
    };
    it('should throw error if address does not belong to user', async () => {
      (addressRepository.findAddressByUserId as jest.Mock).mockResolvedValue(null);

      const promise = userService.updateAddress(addressId, userId, updateData);

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.NOT_FOUND,
        message: MESSAGE.USER.ADDRESS_NOT_FOUND,
      });
      expect(addressRepository.clearDefaultStatus).not.toHaveBeenCalled();
      expect(cacheService.delete).not.toHaveBeenCalled();
    });

    it('should clear default address and invalidate cache when updating to default', async () => {
      (addressRepository.findAddressByUserId as jest.Mock).mockResolvedValue({ id: addressId });
      (addressRepository.updateAddressById as jest.Mock).mockResolvedValue(updateData);

      const result = await userService.updateAddress(userId, addressId, updateData);

      expect(addressRepository.clearDefaultStatus).toHaveBeenCalledWith(userId);
      expect(cacheService.delete).toHaveBeenCalledWith(CACHE_KEYS.USER.ADDRESS_LIST(userId));
      expect(addressRepository.updateAddressById).toHaveBeenCalledWith(addressId, updateData);
      expect(result).toBe(updateData);
    });

    it('should update address but keep default address', async () => {
      updateData.isDefault = false;

      (addressRepository.findAddressByUserId as jest.Mock).mockResolvedValue({ id: addressId });
      (addressRepository.updateAddressById as jest.Mock).mockResolvedValue(updateData);

      const result = await userService.updateAddress(userId, addressId, updateData);

      expect(addressRepository.clearDefaultStatus).not.toHaveBeenCalled();
      expect(cacheService.delete).toHaveBeenCalledWith(CACHE_KEYS.USER.ADDRESS_LIST(userId));
      expect(addressRepository.updateAddressById).toHaveBeenCalledWith(addressId, updateData);
      expect(result).toBe(updateData);
    });
  });

  describe('deleteAddress()', () => {
    it('should delete address and invalidate cache', async () => {
      (addressRepository.findAddressByUserId as jest.Mock).mockResolvedValue({ id: addressId });

      await userService.deleteAddress(userId, addressId);

      expect(addressRepository.deleteAddress).toHaveBeenCalledWith(addressId);
      expect(cacheService.delete).toHaveBeenCalledWith(CACHE_KEYS.USER.ADDRESS_LIST(userId));
    });

    it('should throw error if address does not belong to user or not exist', async () => {
      (addressRepository.findAddressByUserId as jest.Mock).mockResolvedValue(null);

      const promise = userService.deleteAddress(userId, addressId);

      await expect(promise).rejects.toThrow();
      expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.NOT_FOUND,
        message: MESSAGE.USER.ADDRESS_NOT_FOUND,
      });
      expect(cacheService.delete).not.toHaveBeenCalled();
      expect(addressRepository.deleteAddress).not.toHaveBeenCalled();
    });
  });
});
