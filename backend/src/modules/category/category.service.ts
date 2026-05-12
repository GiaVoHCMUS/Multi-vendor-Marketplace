import { AppError } from '@/shared/utils/AppError';
import { slugHelper } from '@/shared/utils/slug';
import { CreateCategoryInput, UpdateCategoryInput } from './category.type';
import { ImageType } from '@/shared/types/image.type';
import { MESSAGE } from '@/shared/constants/message.constants';
import { cacheService } from '@/shared/services/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '@/shared/constants/cache.constants';
import { StatusCodes } from 'http-status-codes';
import { CategoryRepository } from './category.repository';

export class CategoryService {
  constructor(private readonly categoryRepo: CategoryRepository) {}

  async invalidateCategoryList() {
    await cacheService.invalidateTracker(CACHE_KEYS.CATEGORY.TRACKER_LIST);
  }

  async getAll() {
    const version = await cacheService.getTracker(CACHE_KEYS.CATEGORY.TRACKER_LIST);

    const cacheKey = CACHE_KEYS.CATEGORY.LIST(version);

    return cacheService.getOrSet(cacheKey, () => this.categoryRepo.getAll(), CACHE_TTL.WEEK);
  }

  async getBySlug(slug: string) {
    const cacheKey = CACHE_KEYS.CATEGORY.SLUG(slug);

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const category = await this.categoryRepo.getBySlug(slug);

        if (!category) {
          throw new AppError(MESSAGE.CATEGORY.NOT_FOUND, StatusCodes.NOT_FOUND);
        }

        return category;
      },
      CACHE_TTL.WEEK,
    );
  }

  async create(data: CreateCategoryInput, imageUrl?: ImageType) {
    const category = await this.categoryRepo.createCategoryById(data, imageUrl);

    await this.invalidateCategoryList();

    return category;
  }

  async update(id: number, data: UpdateCategoryInput, imageUrl?: ImageType) {
    const category = await this.categoryRepo.findById(id);

    if (!category) {
      throw new AppError(MESSAGE.CATEGORY.NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    const newCategory = {
      name: data.name ?? category.name,
      slug: data.name ? slugHelper.generate(data.name) : category.slug,
      imageUrl: imageUrl ? imageUrl.url : category.imageUrl,
      imagePublicId: imageUrl ? imageUrl.publicId : category.imagePublicId,
      parentId: data.parentId ?? category.parentId,
    };

    const updatedCategory = await this.categoryRepo.updateCategoryById(id, newCategory);
    await cacheService.delete(CACHE_KEYS.CATEGORY.SLUG(category.slug));
    await this.invalidateCategoryList();

    return updatedCategory;
  }

  async delete(id: number) {
    const category = await this.categoryRepo.findById(id);

    if (!category) {
      throw new AppError(MESSAGE.CATEGORY.NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    await cacheService.delete(CACHE_KEYS.CATEGORY.SLUG(category.slug));
    await this.invalidateCategoryList();

    await this.categoryRepo.deleteCategoryById(id);
  }
}
