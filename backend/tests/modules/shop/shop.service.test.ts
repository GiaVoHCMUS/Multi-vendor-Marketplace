import { ShopService } from '@/modules/shop/shop.service';
import { MESSAGE } from '@/shared/constants/message.constants';
import { AppError } from '@/shared/utils/AppError';
import { slugHelper } from '@/shared/utils/slug';
import { StatusCodes } from 'http-status-codes';

jest.mock('@/shared/utils/slug', () => ({
  slugHelper: { generate: jest.fn() },
}));

describe('ShopService', () => {
  let mockShopRepo: any;
  let shopService: ShopService;

  const ownerId = 'user-1';
  const mockShop = {
    id: 'shop-1',
    ownerId,
    name: 'My Old Shop',
    slug: 'my-old-shop',
    description: 'Old description',
    logoUrl: 'http://old-logo.com',
    logoPublicId: 'old-logo-id',
  };

  beforeEach(() => {
    mockShopRepo = {
      findShopByOwerId: jest.fn(),
      createShop: jest.fn(),
      updateMyShop: jest.fn(),
    };

    shopService = new ShopService(mockShopRepo);
  });

  describe('getShopByOwner()', () => {
    it('should throw error if shop not found', async () => {
      mockShopRepo.findShopByOwerId.mockResolvedValue(null);

      const promise = shopService.getShopByOwner(ownerId);

      await expect(promise).rejects.toThrow(AppError);
      // console.log(promise)
      await expect(promise).rejects.toMatchObject({
        message: MESSAGE.SHOP.NOT_FOUND,
        statusCode: StatusCodes.NOT_FOUND,
      });
    });

    it('should return shop if found', async () => {
      mockShopRepo.findShopByOwerId.mockResolvedValue(mockShop);

      const result = await shopService.getShopByOwner(ownerId);

      expect(mockShopRepo.findShopByOwerId).toHaveBeenCalledWith(ownerId);
      expect(result).toEqual(mockShop);
    });
  });

  describe('register()', () => {
    const registerData = { name: 'New Shop', description: 'Hello' };
    const mockLogo = { url: 'http://logo.com', publicId: 'logo-1' };

    it('should throw error if user already registered a shop', async () => {
      mockShopRepo.findShopByOwerId.mockResolvedValue(mockShop); // Đã có shop

      const promise = shopService.register(ownerId, registerData, mockLogo);

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.BAD_REQUEST,
        message: MESSAGE.SHOP.ALREADY_REGISTERED,
      });
      expect(mockShopRepo.createShop).not.toHaveBeenCalled();
    });

    it('should register shop successfully', async () => {
      mockShopRepo.findShopByOwerId.mockResolvedValue(null); // Chưa có shop
      mockShopRepo.createShop.mockResolvedValue({ id: 'new-shop-id', ...registerData });

      const result = await shopService.register(ownerId, registerData, mockLogo);

      expect(mockShopRepo.createShop).toHaveBeenCalledWith(ownerId, registerData, mockLogo);
      expect(result.id).toBe('new-shop-id');
    });
  });

  describe('getMyShop()', () => {
    it('should delegate to getShopByOwner', async () => {
      // Vì getMyShop chỉ gọi lại getShopByOwner, ta chỉ cần test 1 luồng success
      mockShopRepo.findShopByOwerId.mockResolvedValue(mockShop);

      const result = await shopService.getMyShop(ownerId);

      expect(result).toEqual(mockShop);
      expect(mockShopRepo.findShopByOwerId).toHaveBeenCalledWith(ownerId);
    });
  });

  describe('updateMyShop()', () => {
    it('should throw error if shop not found', async () => {
      // getShopByOwner sẽ throw error
      mockShopRepo.findShopByOwerId.mockResolvedValue(null);

      const promise = shopService.updateMyShop(ownerId, { name: 'Update' });

      await expect(promise).rejects.toThrow(MESSAGE.SHOP.NOT_FOUND);
      expect(mockShopRepo.updateMyShop).not.toHaveBeenCalled();
    });

    it('should update shop with new name (generates new slug) and new logo', async () => {
      mockShopRepo.findShopByOwerId.mockResolvedValue(mockShop);
      (slugHelper.generate as jest.Mock).mockReturnValue('new-slug');

      const updateData = { name: 'New Shop Name', description: 'New Desc' };
      const newLogo = { url: 'http://new-logo.com', publicId: 'new-public-id' };
      mockShopRepo.updateMyShop.mockResolvedValue({ ...mockShop, ...updateData });

      await shopService.updateMyShop(ownerId, updateData, newLogo);

      // Kiểm tra xem nó có truyền đúng dữ liệu (mới) xuống Repo không
      expect(slugHelper.generate).toHaveBeenCalledWith('New Shop Name');
      expect(mockShopRepo.updateMyShop).toHaveBeenCalledWith(mockShop.id, {
        name: 'New Shop Name',
        description: 'New Desc',
        slug: 'new-slug',
        logoUrl: 'http://new-logo.com',
        logoPublicId: 'new-public-id',
      });
    });

    it('should update shop keeping old slug and logo if not provided in payload', async () => {
      mockShopRepo.findShopByOwerId.mockResolvedValue(mockShop);

      const updateData = { description: 'Only update description' }; // Không có name, không truyền logo
      mockShopRepo.updateMyShop.mockResolvedValue({ ...mockShop, ...updateData });

      await shopService.updateMyShop(ownerId, updateData);

      // Kiểm tra fallback: Nếu không có name mới thì giữ nguyên slug cũ, không có logo mới giữ logo cũ
      expect(slugHelper.generate).not.toHaveBeenCalled();
      expect(mockShopRepo.updateMyShop).toHaveBeenCalledWith(mockShop.id, {
        description: 'Only update description',
        slug: mockShop.slug, // Giữ nguyên
        logoUrl: mockShop.logoUrl, // Giữ nguyên
        logoPublicId: mockShop.logoPublicId, // Giữ nguyên
      });
    });
  });
});
