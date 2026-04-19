import { prisma } from '@/core/config/prisma';
import { AppError } from '@/shared/utils/AppError';
import { slug } from '@/shared/utils/slug';
import { CreateCategoryInput, UpdateCategoryInput } from './category.type';
import { ImageType } from '@/shared/types/image.type';
import { MESSAGE } from '@/shared/constants/message.constants';
import { cacheService } from '@/shared/services/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '@/shared/constants/cache.constants';
import { StatusCodes } from 'http-status-codes';

export const categoryService = {
  async invalidateCategoryList() {
    await cacheService.invalidateTracker(CACHE_KEYS.CATEGORY.TRACKER_LIST);
  },

  async getAll() {
    const version = await cacheService.getTracker(CACHE_KEYS.CATEGORY.TRACKER_LIST);

    const cacheKey = CACHE_KEYS.CATEGORY.LIST(version);

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        return prisma.category.findMany({
          orderBy: { id: 'desc' },
          select: {
            id: true,
            name: true,
            slug: true,
            imageUrl: true,
            parent: true,
            children: true,
          },
        });
      },
      CACHE_TTL.WEEK,
    );
  },

  async getBySlug(slug: string) {
    const cacheKey = CACHE_KEYS.CATEGORY.SLUG(slug);

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const category = await prisma.category.findUnique({
          where: { slug },
          select: {
            id: true,
            name: true,
            slug: true,
            imageUrl: true,
            parentId: true,
          },
        });
        if (!category) {
          throw new AppError(MESSAGE.CATEGORY.NOT_FOUND, StatusCodes.NOT_FOUND);
        }

        return category;
      },
      CACHE_TTL.WEEK,
    );
  },

  async create(data: CreateCategoryInput, imageUrl?: ImageType) {
    const newSlug = slug.generate(data.name);

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug: newSlug,
        parentId: data.parentId ?? null,
        imageUrl: imageUrl?.url ?? null,
        imagePublicId: imageUrl?.publicId ?? null,
      },
    });

    await this.invalidateCategoryList();

    return category;
  },

  async update(id: number, data: UpdateCategoryInput, imageUrl?: ImageType) {
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new AppError(MESSAGE.CATEGORY.NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name: data.name ?? category.name,
        slug: data.name ? slug.generate(data.name) : category.slug,
        imageUrl: imageUrl ? imageUrl.url : category.imageUrl,
        imagePublicId: imageUrl ? imageUrl.publicId : category.imagePublicId,
        parentId: data.parentId ?? category.parentId,
      },
    });

    await this.invalidateCategoryList();

    return updatedCategory;
  },

  async delete(id: number) {
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new AppError(MESSAGE.CATEGORY.NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    await prisma.category.delete({
      where: { id },
    });

    await this.invalidateCategoryList();
  },
};
