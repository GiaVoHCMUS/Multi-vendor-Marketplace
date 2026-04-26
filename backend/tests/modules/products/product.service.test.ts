import { categoryRepository } from '@/modules/category/category.repository';
import { productRepository } from '@/modules/products/product.repository';
import { productService } from '@/modules/products/product.service';
import { shopRepository } from '@/modules/shop/shop.repository';
import { CACHE_KEYS } from '@/shared/constants/cache.constants';
import { MESSAGE } from '@/shared/constants/message.constants';
import { cacheService } from '@/shared/services/cache.service';
import { AppError } from '@/shared/utils/AppError';
import { cursorUtil } from '@/shared/utils/cursor';
import { slugHelper } from '@/shared/utils/slug';
import { ProductStatus, ShopStatus } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';

jest.mock('@/shared/services/cache.service', () => ({
  cacheService: {
    getOrSet: jest.fn((key, cb) => cb()), // Ép chạy callback để vào repository
    getTracker: jest.fn(),
    invalidateTracker: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/shared/utils/slug', () => ({
  slugHelper: {
    generate: jest.fn(),
  },
}));

jest.mock('@/modules/category/category.repository', () => ({
  categoryRepository: {
    getBySlug: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.mock('@/modules/shop/shop.repository', () => ({
  shopRepository: {
    findShopBySlug: jest.fn(),
    findShopByOwerId: jest.fn(),
  },
}));

jest.mock('@/modules/products/product.repository', () => ({
  productRepository: {
    findProductList: jest.fn(),
    findProductBySlug: jest.fn(),
    createProduct: jest.fn(),
    updateProduct: jest.fn(),
    findProductById: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/shared/utils/cursor', () => ({
  cursorUtil: {
    encode: jest.fn(),
  },
}));

describe('productService', () => {
  const userId = 'user-123';
  const productId = 'prod-123';
  const shopId = 'shop-123';
  const categoryId = 1;
  const image = 'image.jpg';

  const product = {
    id: productId,
    name: 'Test Product',
    slug: 'test-product',
    price: 100,
    images: [{ url: image }],
    shop: { id: shopId, name: 'My Shop' },
    category: { id: categoryId, name: 'Electronics' },
    status: ProductStatus.PUBLISHED,
  };

  describe('getAll()', () => {
    const queryInput = { limit: 10, search: 'test' };

    it('should return empty data if categorySlug or shopSlug is provided but not found', async () => {
      (categoryRepository.getBySlug as jest.Mock).mockResolvedValue(null);

      const result = await productService.getAll({
        ...queryInput,
        categorySlug: 'invalidCategory',
      });

      expect(result.data).toEqual([]);
      expect(result.meta.limit).toBe(queryInput.limit);
      expect(result.meta.nextCursor).toBeNull();
      expect(cacheService.getTracker).not.toHaveBeenCalled();
      expect(productRepository.findProductList).not.toHaveBeenCalled();
    });

    it('should return product list and meta correctly', async () => {
      const mockRepoResult = {
        products: [product, { ...product, id: 'prod-456' }],
        meta: { type: 'cursor' },
      };

      (productRepository.findProductList as jest.Mock).mockResolvedValue(mockRepoResult);
      (cursorUtil.encode as jest.Mock).mockReturnValue('next-cursor-token');

      const result = await productService.getAll(queryInput);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].image).toBe(image);
      expect(productRepository.findProductList).toHaveBeenCalledWith(queryInput, {});
    });

    it('should throw error if pagination meta type is not cursor', async () => {
      (productRepository.findProductList as jest.Mock).mockResolvedValue({
        products: [],
        meta: { type: 'offset' },
      });

      const promise = productService.getAll(queryInput);
      await expect(promise).rejects.toThrow('Phân trang không hợp lệ');
      await expect(promise).rejects.toBeInstanceOf(AppError);
    });
  });

  describe('getBySlug()', () => {
    it('should throw error if product not found', async () => {
      (productRepository.findProductBySlug as jest.Mock).mockResolvedValue(null);

      const promise = productService.getBySlug('unknown');

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        message: MESSAGE.PRODUCT.NOT_FOUND,
        statusCode: StatusCodes.NOT_FOUND,
      });
    });

    it('should return product if found', async () => {
      (productRepository.findProductBySlug as jest.Mock).mockResolvedValue(product);

      const result = await productService.getBySlug('test-product');

      expect(result).toEqual(product);
    });
  });

  describe('create()', () => {
    const createInput = {
      name: 'New Prod',
      price: 50,
      categoryId: categoryId,
      stock: 10,
      status: ProductStatus.PUBLISHED,
    };

    const mockImages = [{ url: image, publicId: '1' }];

    const mockShop = {
      id: '1',
      name: 'Shop Test',
      slug: 'shop-test',
      ownerId: userId,
    };

    it('should throw error if shop not found', async () => {
      (shopRepository.findShopByOwerId as jest.Mock).mockResolvedValue(null);

      const promise = productService.create(userId, createInput, mockImages);

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        message: MESSAGE.SHOP.NOT_FOUND,
        statusCode: StatusCodes.NOT_FOUND,
      });

      expect(categoryRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw error if shop is not active', async () => {
      (shopRepository.findShopByOwerId as jest.Mock).mockResolvedValue(mockShop);
      (shopRepository.findShopByOwerId as jest.Mock).mockResolvedValue({
        status: ShopStatus.PENDING,
      });

      const promise = productService.create(userId, createInput, mockImages);
      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        message: MESSAGE.SHOP.NOT_ACTIVE,
        statusCode: StatusCodes.FORBIDDEN,
      });

      expect(categoryRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw error if category not found', async () => {
      (shopRepository.findShopByOwerId as jest.Mock).mockResolvedValue(mockShop);
      (shopRepository.findShopByOwerId as jest.Mock).mockResolvedValue({
        status: ShopStatus.ACTIVE,
      });
      (categoryRepository.findById as jest.Mock).mockResolvedValue(null);

      const promise = productService.create(userId, createInput, mockImages);
      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        message: MESSAGE.CATEGORY.NOT_FOUND,
        statusCode: StatusCodes.NOT_FOUND,
      });

      expect(productRepository.createProduct).not.toHaveBeenCalled();
    });

    it('should create product and invalidate cache successfully', async () => {
      (shopRepository.findShopByOwerId as jest.Mock).mockResolvedValue(mockShop);
      (shopRepository.findShopByOwerId as jest.Mock).mockResolvedValue({
        status: ShopStatus.ACTIVE,
      });
      (categoryRepository.findById as jest.Mock).mockResolvedValue(categoryId);
      (slugHelper.generate as jest.Mock).mockReturnValue('new-product');
      (productRepository.createProduct as jest.Mock).mockResolvedValue(product);

      const spy = jest.spyOn(productService, 'invalidateProductList');

      const result = await productService.create(userId, createInput, mockImages);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(productRepository.createProduct).toHaveBeenCalled();
      expect(result).toEqual(product);
    });
  });

  describe('update()', () => {
    const updateInput = { name: 'Updated Name' };

    it('should throw error if product not found', async () => {
      (productRepository.findProductById as jest.Mock).mockResolvedValue(null);

      const spy = jest.spyOn(productService, 'invalidateProductList');

      const promise = productService.update(productId, updateInput);
      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.NOT_FOUND,
        message: MESSAGE.PRODUCT.NOT_FOUND,
      });

      expect(spy).not.toHaveBeenCalled();
      expect(cacheService.delete).not.toHaveBeenCalled();
    });

    it('should update product and clear cache successfully', async () => {
      (productRepository.findProductById as jest.Mock).mockResolvedValue(product);
      (productRepository.updateProduct as jest.Mock).mockResolvedValue({
        ...product,
        name: 'Updated Name',
      });
      const spy = jest.spyOn(productService, 'invalidateProductList');

      const result = await productService.update(productId, updateInput);

      expect(productRepository.updateProduct).toHaveBeenCalledWith(productId, expect.any(Object));
      expect(cacheService.delete).toHaveBeenCalledWith(CACHE_KEYS.PRODUCT.SLUG(product.slug));
      expect(result.name).toBe('Updated Name');
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should update product, images and clear cache successfully', async () => {
      const mockImages = [{ url: image, publicId: '1' }];
      (productRepository.findProductById as jest.Mock).mockResolvedValue(product);
      (productRepository.updateProduct as jest.Mock).mockResolvedValue({
        ...product,
        name: 'Updated Name',
      });
      const spy = jest.spyOn(productService, 'invalidateProductList');

      const result = await productService.update(productId, updateInput, mockImages);

      expect(productRepository.updateProduct).toHaveBeenCalledWith(productId, expect.any(Object));
      expect(cacheService.delete).toHaveBeenCalledWith(CACHE_KEYS.PRODUCT.SLUG(product.slug));
      expect(result.name).toBe('Updated Name');
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete()', () => {
    it('should throw error if product not found', async () => {
      (productRepository.findProductById as jest.Mock).mockResolvedValue(null);
      const spy = jest.spyOn(productService, 'invalidateProductList');

      const promise = productService.delete(productId);

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.NOT_FOUND,
        message: MESSAGE.PRODUCT.NOT_FOUND,
      });

      expect(productRepository.delete).not.toHaveBeenCalled();
      expect(cacheService.delete).not.toHaveBeenCalled();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should delete product and clear cache successfully', async () => {
      (productRepository.findProductById as jest.Mock).mockResolvedValue(product);
      (productRepository.delete as jest.Mock).mockResolvedValue(product);

      const spy = jest.spyOn(productService, 'invalidateProductList');

      await productService.delete(productId);

      expect(productRepository.delete).toHaveBeenCalledWith(productId);
      expect(cacheService.delete).toHaveBeenCalled();

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
