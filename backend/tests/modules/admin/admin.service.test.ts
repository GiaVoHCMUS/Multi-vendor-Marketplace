import { mailJob } from '@/jobs/mail/mail.job';
import { AdminService } from '@/modules/admin/admin.service';
import { MESSAGE } from '@/shared/constants/message.constants';
import { AppError } from '@/shared/utils/AppError';
import { ShopStatus, UserRole } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';

jest.mock('@/jobs/mail/mail.job', () => ({
  mailJob: {
    sendShopApproval: jest.fn(),
    sendBannedApproval: jest.fn(),
  },
}));

jest.mock('@/shared/services/cache.service', () => ({
  cacheService: {
    getOrSet: jest.fn((key, cb) => cb()),
  },
}));

describe('AdminService', () => {
  let adminService: AdminService;

  let mockShopRepo: any;
  let mockUserRepo: any;
  let mockOrderRepo: any;
  let mockTxManager: any;

  beforeEach(() => {
    mockShopRepo = {
      findShopWithOwner: jest.fn(),
      approveShopTransaction: jest.fn(),
      updateShopStatus: jest.fn(),
      countActiveShops: jest.fn(),
      findPendingShops: jest.fn(),
      useTransaction: jest.fn().mockReturnThis(),
    };

    mockUserRepo = {
      getProfileById: jest.fn(),
      softDeleteUser: jest.fn(),
      countActiveUsers: jest.fn(),
      findUsersForAdmin: jest.fn(),
      useTransaction: jest.fn().mockReturnThis(),
      updateRole: jest.fn(),
    };

    mockOrderRepo = {
      countTotalOrders: jest.fn(),
      calculateTotalRevenue: jest.fn(),
      findOrdersForAdmin: jest.fn(),
    };

    mockTxManager = {
      run: jest.fn().mockImplementation(async (fn) => await fn('fake-prisma-transaction-client')),
    };

    adminService = new AdminService(mockShopRepo, mockUserRepo, mockOrderRepo, mockTxManager);
  });

  describe('approveShop', () => {
    const mockShopId = 'shop-1';
    const mockShop = {
      id: mockShopId,
      status: ShopStatus.PENDING,
      ownerId: 'user-1',
      name: 'Test Shop',
      owner: { email: 'test@example.com', fullName: 'Test User' },
    };

    it('should throw an error if shop is not found', async () => {
      mockShopRepo.findShopWithOwner.mockResolvedValue(null);

      const promise = adminService.approveShop(mockShopId);

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        message: MESSAGE.ADMIN.SHOP_NOT_FOUND,
        statusCode: StatusCodes.NOT_FOUND,
      });
      expect(mockShopRepo.approveShopTransaction).not.toHaveBeenCalled();
    });

    it('should throw an error if shop is already approved (ACTIVE)', async () => {
      mockShopRepo.findShopWithOwner.mockResolvedValue({ ...mockShop, status: ShopStatus.ACTIVE });

      const promise = adminService.approveShop(mockShopId);

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        message: MESSAGE.ADMIN.SHOP_ALREADY_APPROVED,
        statusCode: StatusCodes.BAD_REQUEST,
      });
      expect(mockShopRepo.approveShopTransaction).not.toHaveBeenCalled();
    });

    it('should approve shop successfully, update db and send email', async () => {
      mockShopRepo.findShopWithOwner.mockResolvedValue(mockShop);
      mockShopRepo.updateShopStatus.mockResolvedValue({
        ...mockShop,
        status: ShopStatus.ACTIVE,
      });

      const result = await adminService.approveShop(mockShopId);

      expect(mockTxManager.run).toHaveBeenCalled();
      expect(mockShopRepo.useTransaction).toHaveBeenCalledWith('fake-prisma-transaction-client');
      expect(mockUserRepo.useTransaction).toHaveBeenCalledWith('fake-prisma-transaction-client');

      // Kiểm tra các hàm update được gọi với đúng data
      expect(mockShopRepo.updateShopStatus).toHaveBeenCalledWith(mockShopId, ShopStatus.ACTIVE);
      expect(mockUserRepo.updateRole).toHaveBeenCalledWith(mockShop.ownerId, UserRole.SELLER);

      // Kiểm tra gửi mail
      expect(mailJob.sendShopApproval).toHaveBeenCalledWith({
        to: mockShop.owner.email,
        ownerName: mockShop.owner.fullName,
        shopName: mockShop.name,
      });

      expect(result.status).toBe(ShopStatus.ACTIVE);
    });
  });

  describe('banShop', () => {
    const mockShopId = 'shop-1';
    const mockShop = {
      id: mockShopId,
      status: ShopStatus.ACTIVE,
      ownerId: 'user-1',
      name: 'Test Shop',
      owner: { email: 'test@example.com', fullName: 'Test User' },
    };

    it('should throw an error if shop is not found', async () => {
      mockShopRepo.findShopWithOwner.mockResolvedValue(null);

      const promise = adminService.banShop(mockShopId);

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        message: MESSAGE.ADMIN.SHOP_NOT_FOUND,
        statusCode: StatusCodes.NOT_FOUND,
      });
      expect(mockShopRepo.updateShopStatus).not.toHaveBeenCalled();
      expect(mailJob.sendBannedApproval).not.toHaveBeenCalled();
    });

    it('should ban shop successfully and send report email', async () => {
      mockShopRepo.findShopWithOwner.mockResolvedValue(mockShop);
      mockShopRepo.updateShopStatus.mockResolvedValue({
        ...mockShop,
        status: ShopStatus.BANNED,
      });

      const result = await adminService.banShop(mockShopId);

      expect(mockShopRepo.updateShopStatus).toHaveBeenCalledWith(mockShopId, ShopStatus.BANNED);
      expect(mailJob.sendBannedApproval).toHaveBeenCalledWith({
        to: mockShop.owner.email,
        ownerName: mockShop.owner.fullName,
        shopName: mockShop.name,
        reason: 'Vi phạm chính sách kinh doanh',
      });
      expect(result.status).toBe(ShopStatus.BANNED);
    });
  });

  describe('banUser', () => {
    it('should throw an error if user is not found', async () => {
      mockUserRepo.getProfileById.mockResolvedValue(null);

      const promise = adminService.banUser('user-1');

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        message: MESSAGE.ADMIN.USER_NOT_FOUND,
        statusCode: StatusCodes.NOT_FOUND,
      });
      expect(mockUserRepo.softDeleteUser).not.toHaveBeenCalled();
    });

    it('should ban user successfully (soft delete)', async () => {
      mockUserRepo.getProfileById.mockResolvedValue({ id: 'user-1' });
      mockUserRepo.softDeleteUser.mockResolvedValue({ id: 'user-1', deletedAt: new Date() });

      await adminService.banUser('user-1');

      expect(mockUserRepo.softDeleteUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getStats', () => {
    it('should fetch statistics data from cache or database', async () => {
      mockUserRepo.countActiveUsers.mockResolvedValue(100);
      mockShopRepo.countActiveShops.mockResolvedValue(50);
      mockOrderRepo.countTotalOrders.mockResolvedValue(200);
      mockOrderRepo.calculateTotalRevenue.mockResolvedValue(5000000);

      const result = await adminService.getStats();

      expect(result).toEqual({
        totalUsers: 100,
        totalShops: 50,
        totalOrders: 200,
        totalRevenue: 5000000,
      });
      expect(mockUserRepo.countActiveUsers).toHaveBeenCalled();
      expect(mockShopRepo.countActiveShops).toHaveBeenCalled();
      expect(mockOrderRepo.countTotalOrders).toHaveBeenCalled();
      expect(mockOrderRepo.calculateTotalRevenue).toHaveBeenCalled();
    });
  });

  // Shared mock data for pagination methods
  const mockPaginationInput = { page: 1, limit: 10 };
  const mockBadMeta = { type: 'cursor' };
  const mockGoodMeta = { type: 'offset', page: 1, limit: 10 };
  const paginationErrorMessage = MESSAGE.COMMON.INVALID_PAGINATION;

  describe('getPendingShops', () => {
    it('should throw an error if pagination meta is invalid', async () => {
      mockShopRepo.findPendingShops.mockResolvedValue({ shops: [], total: 0, meta: mockBadMeta });

      const promise = adminService.getPendingShops(mockPaginationInput);

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        message: paginationErrorMessage,
        statusCode: StatusCodes.BAD_REQUEST,
      });
    });

    it('should return valid data and meta', async () => {
      mockShopRepo.findPendingShops.mockResolvedValue({
        shops: [{ id: 1 }],
        total: 1,
        meta: mockGoodMeta,
      });

      const result = await adminService.getPendingShops(mockPaginationInput);

      expect(result.data.length).toBe(1);
      expect(result.meta).toBeDefined();
    });
  });

  describe('getUsers', () => {
    it('should throw an error if pagination meta is invalid', async () => {
      mockUserRepo.findUsersForAdmin.mockResolvedValue({ users: [], total: 0, meta: mockBadMeta });

      const promise = adminService.getUsers(mockPaginationInput);

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        message: paginationErrorMessage,
        statusCode: StatusCodes.BAD_REQUEST,
      });
    });

    it('should return valid data and meta', async () => {
      mockUserRepo.findUsersForAdmin.mockResolvedValue({
        users: [{ id: 1 }],
        total: 1,
        meta: mockGoodMeta,
      });

      const result = await adminService.getUsers(mockPaginationInput);

      expect(result.data.length).toBe(1);
      expect(result.meta).toBeDefined();
    });
  });

  describe('getOrders', () => {
    it('should throw an error if pagination meta is invalid', async () => {
      mockOrderRepo.findOrdersForAdmin.mockResolvedValue({
        orders: [],
        total: 0,
        meta: mockBadMeta,
      });

      const promise = adminService.getOrders(mockPaginationInput);

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        message: paginationErrorMessage,
        statusCode: StatusCodes.BAD_REQUEST,
      });
    });

    it('should return valid data and meta', async () => {
      mockOrderRepo.findOrdersForAdmin.mockResolvedValue({
        orders: [{ id: 1 }],
        total: 1,
        meta: mockGoodMeta,
      });

      const result = await adminService.getOrders(mockPaginationInput);

      expect(result.data.length).toBe(1);
      expect(result.meta).toBeDefined();
    });
  });
});
