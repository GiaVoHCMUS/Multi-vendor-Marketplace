import { CartService } from '@/modules/cart/cart.service';
import { RedisCartRepository } from '@/modules/cart/repositories/redis-cart.cache';
import { productRepository } from '@/modules/products/product.repository';
import { MESSAGE } from '@/shared/constants/message.constants';
import { AppError } from '@/shared/utils/AppError';
import { StatusCodes } from 'http-status-codes';

jest.mock('@/modules/products/product.repository', () => ({
  productRepository: {
    findPublishedById: jest.fn(),
    findPublishedByIds: jest.fn(),
  },
}));

describe('CartService', () => {
  let cartService: CartService;
  let mockCartRepo: jest.Mocked<RedisCartRepository>;

  const userId = 'user-01';
  const productId = 'prod-01';

  beforeEach(() => {
    // Khởi tạo Mock cho Repository
    mockCartRepo = {
      getAll: jest.fn(),
      get: jest.fn(),
      increment: jest.fn(),
      set: jest.fn(),
      exists: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
      setTTL: jest.fn(),
    } as any;

    // Inject mock vào service
    cartService = new CartService(mockCartRepo);
  });

  describe('getCart()', () => {
    it('should return empty cart when repository has no data', async () => {
      mockCartRepo.getAll.mockResolvedValue({});

      const result = await cartService.getCart(userId);

      expect(result).toEqual({ items: [], totalItems: 0 });
      expect(mockCartRepo.getAll).toHaveBeenCalledWith(userId);
      expect(productRepository.findPublishedByIds).not.toHaveBeenCalled();
    });

    it('should map product information and calculate total items correctly', async () => {
      // Mock Redis data
      mockCartRepo.getAll.mockResolvedValue({ [productId]: '2' });

      // Mock Product DB data
      const mockProduct = {
        id: productId,
        name: 'Test Product',
        slug: 'test-product',
        price: 100000,
        stock: 10,
        images: [{ url: 'test.jpg' }],
        shop: { id: 'shop-01', name: 'My Shop' },
      };

      (productRepository.findPublishedByIds as jest.Mock).mockResolvedValue([mockProduct]);

      const result = await cartService.getCart(userId);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].productId).toBe(productId);
      expect(result.items[0].quantity).toBe(2);
      expect(result.totalItems).toBe(2);
    });
  });

  describe('addToCart()', () => {
    const input = { productId, quantity: 5 };

    it('should throw error if product is not exist', async () => {
      (productRepository.findPublishedById as jest.Mock).mockResolvedValue(null);

      const promise = cartService.addToCart(userId, input);

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.NOT_FOUND,
        message: MESSAGE.CART.PRODUCT_NOT_FOUND,
      });

      expect(mockCartRepo.get).not.toHaveBeenCalled();
      expect(mockCartRepo.increment).not.toHaveBeenCalled();
      expect(mockCartRepo.setTTL).not.toHaveBeenCalled();
    });

    it('should throw error if new total quantity exceeds stock', async () => {
      (productRepository.findPublishedById as jest.Mock).mockResolvedValue({
        id: productId,
        stock: 3,
      });

      mockCartRepo.get.mockResolvedValue('2');

      const promise = cartService.addToCart(userId, input);

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.BAD_REQUEST,
        message: MESSAGE.CART.QUANTITY_EXCEEDS_STOCK,
      });

      expect(mockCartRepo.increment).not.toHaveBeenCalled();
      expect(mockCartRepo.setTTL).not.toHaveBeenCalled();
    });

    it('should increment quantity and set TTL if valid', async () => {
      (productRepository.findPublishedById as jest.Mock).mockResolvedValue({
        id: productId,
        stock: 10,
      });
      mockCartRepo.get.mockResolvedValue('2');

      await cartService.addToCart(userId, input);

      expect(mockCartRepo.increment).toHaveBeenCalledWith(userId, input.productId, input.quantity);
      expect(mockCartRepo.setTTL).toHaveBeenCalledWith(userId);
    });
  });

  describe('updateItem()', () => {
    it('should throw error if product is not in cart', async () => {
      mockCartRepo.exists.mockResolvedValue(0); // 0 means false in Redis hExists

      const promise = cartService.updateItem(userId, productId, 10);

      await expect(promise).rejects.toThrow(
        new AppError(MESSAGE.CART.PRODUCT_NOT_IN_CART, StatusCodes.NOT_FOUND),
      );
      expect(mockCartRepo.set).not.toHaveBeenCalled();
      expect(mockCartRepo.setTTL).not.toHaveBeenCalled();
    });

    it('should throw error if product is not exist', async () => {
      mockCartRepo.exists.mockResolvedValue(1);
      (productRepository.findPublishedById as jest.Mock).mockResolvedValue(null);

      const promise = cartService.updateItem(userId, productId, 10);
      await expect(promise).rejects.toThrow(
        new AppError(MESSAGE.CART.PRODUCT_NOT_FOUND, StatusCodes.NOT_FOUND),
      );
      expect(mockCartRepo.set).not.toHaveBeenCalled();
      expect(mockCartRepo.setTTL).not.toHaveBeenCalled();
    });

    it("should throw error if input quantity is greater than the product's stock", async () => {
      mockCartRepo.exists.mockResolvedValue(1);
      (productRepository.findPublishedById as jest.Mock).mockResolvedValue({
        id: productId,
        stock: 5,
      });

      const promise = cartService.updateItem(userId, productId, 10);
      await expect(promise).rejects.toThrow(
        new AppError(MESSAGE.CART.QUANTITY_EXCEEDS_STOCK, StatusCodes.BAD_REQUEST),
      );
      expect(mockCartRepo.set).not.toHaveBeenCalled();
      expect(mockCartRepo.setTTL).not.toHaveBeenCalled();
    });

    it('should set new quantity and update TTL successfully', async () => {
      mockCartRepo.exists.mockResolvedValue(1);
      (productRepository.findPublishedById as jest.Mock).mockResolvedValue({
        id: productId,
        stock: 50,
      });

      await cartService.updateItem(userId, productId, 10);

      expect(mockCartRepo.set).toHaveBeenCalledWith(userId, productId, 10);
      expect(mockCartRepo.setTTL).toHaveBeenCalledWith(userId);
    });
  });

  describe('removeFromCart()', () => {
    it('should call repository to remove specific product', async () => {
      await cartService.removeFromCart(userId, productId);
      expect(mockCartRepo.remove).toHaveBeenCalledWith(userId, productId);
    });
  });

  describe('clearCart()', () => {
    it('should call repository to clear the entire cart', async () => {
      await cartService.clearCart(userId);
      expect(mockCartRepo.clear).toHaveBeenCalledWith(userId);
    });
  });
});
