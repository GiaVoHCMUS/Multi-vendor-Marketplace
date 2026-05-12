import { ProductService } from '@/modules/products/product.service';
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

// jest.mock('@/modules/category/category.repository', () => ({
//   categoryRepository: {
//     getBySlug: jest.fn(),
//     findById: jest.fn(),
//   },
// }));

// jest.mock('@/modules/shop/shop.repository', () => ({
//   shopRepository: {
//     findShopBySlug: jest.fn(),
//     findShopByOwerId: jest.fn(),
//   },
// }));

// jest.mock('@/modules/products/repositories/product.repository', () => ({
//   productRepository: {
//     findProductList: jest.fn(),
//     findProductBySlug: jest.fn(),
//     createProduct: jest.fn(),
//     updateProduct: jest.fn(),
//     findProductById: jest.fn(),
//     delete: jest.fn(),
//   },
// }));

jest.mock('@/shared/utils/cursor', () => ({
  cursorUtil: {
    encode: jest.fn(),
  },
}));

describe('productService', () => {
  let mockProductRepo: any;
  let mockCategoryRepo: any;
  let mockShopRepo: any;
  let productService: ProductService;

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

  beforeEach(() => {
    mockProductRepo = {
      findProductList: jest.fn(),
      findProductBySlug: jest.fn(),
      createProduct: jest.fn(),
      updateProduct: jest.fn(),
      findProductById: jest.fn(),
      delete: jest.fn(),
    };

    mockCategoryRepo = {
      getBySlug: jest.fn(),
      findById: jest.fn(),
    };

    mockShopRepo = {
      findShopBySlug: jest.fn(),
      findShopByOwerId: jest.fn(),
    };

    productService = new ProductService(mockProductRepo, mockCategoryRepo, mockShopRepo);
  });

  describe('getAll()', () => {
    const queryInput = { limit: 10, search: 'test' };

    it('should return empty data if categorySlug or shopSlug is provided but not found', async () => {
      mockCategoryRepo.getBySlug.mockResolvedValue(null);

      const result = await productService.getAll({
        ...queryInput,
        categorySlug: 'invalidCategory',
      });

      expect(result.data).toEqual([]);
      expect(result.meta.limit).toBe(queryInput.limit);
      expect(result.meta.nextCursor).toBeNull();
      expect(cacheService.getTracker).not.toHaveBeenCalled();
      expect(mockProductRepo.findProductList).not.toHaveBeenCalled();
    });

    it('should return product list and meta correctly', async () => {
      const mockRepoResult = {
        products: [product, { ...product, id: 'prod-456' }],
        meta: { type: 'cursor' },
      };

      mockProductRepo.findProductList.mockResolvedValue(mockRepoResult);
      (cursorUtil.encode as jest.Mock).mockReturnValue('next-cursor-token');

      const result = await productService.getAll(queryInput);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].image).toBe(image);
      expect(mockProductRepo.findProductList).toHaveBeenCalledWith(queryInput, {});
    });

    it('should throw error if pagination meta type is not cursor', async () => {
      mockProductRepo.findProductList.mockResolvedValue({
        products: [],
        meta: { type: 'offset' },
      });

      const promise = productService.getAll(queryInput);
      await expect(promise).rejects.toThrow(MESSAGE.COMMON.INVALID_PAGINATION);
      await expect(promise).rejects.toBeInstanceOf(AppError);
    });
  });

  describe('getBySlug()', () => {
    it('should throw error if product not found', async () => {
      mockProductRepo.findProductBySlug.mockResolvedValue(null);

      const promise = productService.getBySlug('unknown');

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        message: MESSAGE.PRODUCT.NOT_FOUND,
        statusCode: StatusCodes.NOT_FOUND,
      });
    });

    it('should return product if found', async () => {
      mockProductRepo.findProductBySlug.mockResolvedValue(product);

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
      mockShopRepo.findShopByOwerId.mockResolvedValue(null);

      const promise = productService.create(userId, createInput, mockImages);

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        message: MESSAGE.SHOP.NOT_FOUND,
        statusCode: StatusCodes.NOT_FOUND,
      });

      expect(mockCategoryRepo.findById).not.toHaveBeenCalled();
    });

    it('should throw error if shop is not active', async () => {
      mockShopRepo.findShopByOwerId.mockResolvedValue(mockShop);
      mockShopRepo.findShopByOwerId.mockResolvedValue({
        status: ShopStatus.PENDING,
      });

      const promise = productService.create(userId, createInput, mockImages);
      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        message: MESSAGE.SHOP.NOT_ACTIVE,
        statusCode: StatusCodes.FORBIDDEN,
      });

      expect(mockCategoryRepo.findById).not.toHaveBeenCalled();
    });

    it('should throw error if category not found', async () => {
      mockShopRepo.findShopByOwerId.mockResolvedValue(mockShop);
      mockShopRepo.findShopByOwerId.mockResolvedValue({
        status: ShopStatus.ACTIVE,
      });
      mockCategoryRepo.findById.mockResolvedValue(null);

      const promise = productService.create(userId, createInput, mockImages);
      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        message: MESSAGE.CATEGORY.NOT_FOUND,
        statusCode: StatusCodes.NOT_FOUND,
      });

      expect(mockProductRepo.createProduct).not.toHaveBeenCalled();
    });

    it('should create product and invalidate cache successfully', async () => {
      mockShopRepo.findShopByOwerId.mockResolvedValue(mockShop);
      mockShopRepo.findShopByOwerId.mockResolvedValue({
        status: ShopStatus.ACTIVE,
      });
      mockCategoryRepo.findById.mockResolvedValue(categoryId);
      (slugHelper.generate as jest.Mock).mockReturnValue('new-product');
      mockProductRepo.createProduct.mockResolvedValue(product);

      const spy = jest.spyOn(productService, 'invalidateProductList');

      const result = await productService.create(userId, createInput, mockImages);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(mockProductRepo.createProduct).toHaveBeenCalled();
      expect(result).toEqual(product);
    });
  });

  describe('update()', () => {
    const updateInput = { name: 'Updated Name' };

    it('should throw error if product not found', async () => {
      mockProductRepo.findProductById.mockResolvedValue(null);

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
      mockProductRepo.findProductById.mockResolvedValue(product);
      mockProductRepo.updateProduct.mockResolvedValue({
        ...product,
        name: 'Updated Name',
      });
      const spy = jest.spyOn(productService, 'invalidateProductList');

      const result = await productService.update(productId, updateInput);

      expect(mockProductRepo.updateProduct).toHaveBeenCalledWith(productId, expect.any(Object));
      expect(cacheService.delete).toHaveBeenCalledWith(CACHE_KEYS.PRODUCT.SLUG(product.slug));
      expect(result.name).toBe('Updated Name');
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should update product, images and clear cache successfully', async () => {
      const mockImages = [{ url: image, publicId: '1' }];
      mockProductRepo.findProductById.mockResolvedValue(product);
      mockProductRepo.updateProduct.mockResolvedValue({
        ...product,
        name: 'Updated Name',
      });
      const spy = jest.spyOn(productService, 'invalidateProductList');

      const result = await productService.update(productId, updateInput, mockImages);

      expect(mockProductRepo.updateProduct).toHaveBeenCalledWith(productId, expect.any(Object));
      expect(cacheService.delete).toHaveBeenCalledWith(CACHE_KEYS.PRODUCT.SLUG(product.slug));
      expect(result.name).toBe('Updated Name');
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete()', () => {
    it('should throw error if product not found', async () => {
      mockProductRepo.findProductById.mockResolvedValue(null);
      const spy = jest.spyOn(productService, 'invalidateProductList');

      const promise = productService.delete(productId);

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.NOT_FOUND,
        message: MESSAGE.PRODUCT.NOT_FOUND,
      });

      expect(mockProductRepo.delete).not.toHaveBeenCalled();
      expect(cacheService.delete).not.toHaveBeenCalled();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should delete product and clear cache successfully', async () => {
      (mockProductRepo.findProductById as jest.Mock).mockResolvedValue(product);
      (mockProductRepo.delete as jest.Mock).mockResolvedValue(product);

      const spy = jest.spyOn(productService, 'invalidateProductList');

      await productService.delete(productId);

      expect(mockProductRepo.delete).toHaveBeenCalledWith(productId);
      expect(cacheService.delete).toHaveBeenCalled();

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
