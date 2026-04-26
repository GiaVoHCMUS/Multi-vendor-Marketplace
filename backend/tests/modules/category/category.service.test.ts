import { categoryService } from '@/modules/category/category.service';
import { categoryRepository } from '@/modules/category/category.repository';
import { cacheService } from '@/shared/services/cache.service';
import { CACHE_KEYS } from '@/shared/constants/cache.constants';
import { MESSAGE } from '@/shared/constants/message.constants';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '@/shared/utils/AppError';
import { slugHelper } from '@/shared/utils/slug';

jest.mock('@/modules/category/category.repository', () => ({
  categoryRepository: {
    getAll: jest.fn(),
    getBySlug: jest.fn(),
    findById: jest.fn(),
    createCategoryById: jest.fn(),
    updateCategoryById: jest.fn(),
    deleteCategoryById: jest.fn(),
  },
}));

jest.mock('@/shared/services/cache.service', () => ({
  cacheService: {
    getTracker: jest.fn(),
    invalidateTracker: jest.fn(),
    getOrSet: jest.fn((key, cb) => cb()),
    delete: jest.fn(),
  },
}));

jest.mock('@/shared/utils/slug', () => ({
  slugHelper: {
    generate: jest.fn(),
  },
}));

describe('categoryService', () => {
  const categoryId1 = 1;
  const mockCategory1 = {
    id: categoryId1,
    name: 'Electronics 1',
    slug: 'electronics 1',
    imageUrl: 'http://image.com/1.png',
    imagePublicId: 'img_1',
    parentId: null,
  };

  const categoryId2 = 2;
  const mockCategory2 = {
    id: categoryId2,
    name: 'Electronics 2',
    slug: 'electronics 2',
    imageUrl: 'http://image.com/2.png',
    imagePublicId: 'img_2',
    parentId: null,
  };

  describe('getAll()', () => {
    it('should retrieve categories from cache or repo with versioning', async () => {
      const version = '1';
      (cacheService.getTracker as jest.Mock).mockResolvedValue(version);
      (categoryRepository.getAll as jest.Mock).mockResolvedValue([mockCategory1, mockCategory2]);

      const result = await categoryService.getAll();

      expect(cacheService.getTracker).toHaveBeenCalledWith(CACHE_KEYS.CATEGORY.TRACKER_LIST);
      expect(result).toEqual([mockCategory1, mockCategory2]);
    });
  });

  describe('getBySlug()', () => {
    it('should return category when slug exists', async () => {
      (categoryRepository.getBySlug as jest.Mock).mockResolvedValue(mockCategory1);

      const result = await categoryService.getBySlug('electronics 1');

      expect(categoryRepository.getBySlug).toHaveBeenCalledWith('electronics 1');
      expect(result).toEqual(mockCategory1);
    });

    it('should throw AppError 404 when slug not found', async () => {
      (categoryRepository.getBySlug as jest.Mock).mockResolvedValue(null);

      const promise = categoryService.getBySlug('non-exist');

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.NOT_FOUND,
        message: MESSAGE.CATEGORY.NOT_FOUND,
      });
    });
  });

  describe('create()', () => {
    it('should create category and invalidate list version', async () => {
      const createData = { name: 'New Category' };
      (categoryRepository.createCategoryById as jest.Mock).mockResolvedValue(mockCategory1);

      await categoryService.create(createData);

      expect(categoryRepository.createCategoryById).toHaveBeenCalledWith(createData, undefined);
      expect(cacheService.invalidateTracker).toHaveBeenCalledWith(CACHE_KEYS.CATEGORY.TRACKER_LIST);
    });
  });

  describe('update()', () => {
    const updateInput = { name: 'Updated Name' };

    it('should update category, delete old slug cache and invalidate list', async () => {
      (categoryRepository.findById as jest.Mock).mockResolvedValue(mockCategory1);
      (slugHelper.generate as jest.Mock).mockReturnValue(mockCategory1.slug);
      (categoryRepository.updateCategoryById as jest.Mock).mockResolvedValue({
        ...mockCategory1,
        name: 'Updated Name',
      });

      await categoryService.update(categoryId1, updateInput, undefined);

      expect(categoryRepository.updateCategoryById).toHaveBeenCalledWith(categoryId1, {
        ...mockCategory1,
        id: undefined,
        name: 'Updated Name',
      });
      // Kiểm tra xóa cache slug cũ
      expect(cacheService.delete).toHaveBeenCalledWith(
        CACHE_KEYS.CATEGORY.SLUG(mockCategory1.slug),
      );
      expect(cacheService.invalidateTracker).toHaveBeenCalledWith(CACHE_KEYS.CATEGORY.TRACKER_LIST);
    });

    it('should throw 404 if category to update does not exist', async () => {
      (categoryRepository.findById as jest.Mock).mockResolvedValue(null);

      const promise = categoryService.update(categoryId1, updateInput);

      await expect(promise).rejects.toThrow(AppError);
      expect(cacheService.delete).not.toHaveBeenCalled();
    });

    it('should use new image data when imageUrl is provided', async () => {
      // Bối cảnh: Có Category cũ và truyền vào ảnh mới
      (categoryRepository.findById as jest.Mock).mockResolvedValue(mockCategory1);
      (categoryRepository.updateCategoryById as jest.Mock).mockResolvedValue({
        ...mockCategory1,
        imageUrl: 'new-url.png',
        imagePublicId: 'new-id',
      });

      const newImage = { url: 'new-url.png', publicId: 'new-id' };

      await categoryService.update(categoryId1, { name: mockCategory1.name }, newImage);

      // Kiểm tra: Repository phải nhận được url và publicId MỚI
      expect(categoryRepository.updateCategoryById).toHaveBeenCalledWith(mockCategory1.id, {
        ...mockCategory1,
        id: undefined,
        imageUrl: newImage.url,
        imagePublicId: newImage.publicId,
      });
      expect(cacheService.delete).toHaveBeenCalledWith(
        CACHE_KEYS.CATEGORY.SLUG(mockCategory1.slug),
      );
    });

    it('should use existing data when update input fields are missing (branch coverage)', async () => {
      (categoryRepository.findById as jest.Mock).mockResolvedValue(mockCategory1);

      // 2. Input rỗng
      const emptyUpdateInput = {};
      const noImage = undefined;

      (categoryRepository.updateCategoryById as jest.Mock).mockResolvedValue({ ...mockCategory1 });

      await categoryService.update(1, emptyUpdateInput, noImage);

      // 3. Kiểm tra xem Repository có nhận được ĐÚNG dữ liệu cũ hay không
      // Đây là lúc test các nhánh "category.name", "category.slug", v.v...
      expect(categoryRepository.updateCategoryById).toHaveBeenCalledWith(1, {
        name: mockCategory1.name,
        slug: mockCategory1.slug,
        imageUrl: mockCategory1.imageUrl,
        imagePublicId: mockCategory1.imagePublicId,
        parentId: mockCategory1.parentId,
      });

      expect(cacheService.delete).toHaveBeenCalledWith(
        CACHE_KEYS.CATEGORY.SLUG(mockCategory1.slug),
      );
    });
  });

  describe('delete()', () => {
    it('should delete category, remove slug cache and invalidate list', async () => {
      (categoryRepository.findById as jest.Mock).mockResolvedValue(mockCategory1);

      await categoryService.delete(categoryId1);

      expect(cacheService.delete).toHaveBeenCalledWith(
        CACHE_KEYS.CATEGORY.SLUG(mockCategory1.slug),
      );
      expect(cacheService.invalidateTracker).toHaveBeenCalledWith(CACHE_KEYS.CATEGORY.TRACKER_LIST);
      expect(categoryRepository.deleteCategoryById).toHaveBeenCalledWith(categoryId1);
    });

    it('should throw 404 if category to delete does not exist', async () => {
      (categoryRepository.findById as jest.Mock).mockResolvedValue(null);

      const promise = categoryService.delete(categoryId1);

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.NOT_FOUND,
        message: MESSAGE.CATEGORY.NOT_FOUND,
      });
      expect(cacheService.delete).not.toHaveBeenCalled();
      expect(categoryRepository.deleteCategoryById).not.toHaveBeenCalled();
    });
  });
});
