import { prisma } from '@/core/config/prisma';
import { AppError } from '@/shared/utils/AppError';
import { slug } from '@/shared/utils/slug';
import { CreateCategoryInput, UpdateCategoryInput } from './category.type';
import { ImageType } from '@/shared/types/image.type';
import { MESSAGE } from '@/shared/constants/message.constants';

export const categoryService = {
  getAll: async () => {
    return prisma.category.findMany({
      orderBy: { id: 'asc' },
      include: {
        children: true,
      },
    });
  },

  getBySlug: async (slug: string) => {
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        products: true,
      },
    });

    if (!category) {
      throw new AppError(MESSAGE.CATEGORY.NOT_FOUND, 404);
    }

    return category;
  },

  create: async (data: CreateCategoryInput, imageUrl?: ImageType) => {
    const newSlug = slug.generate(data.name);

    return prisma.category.create({
      data: {
        name: data.name,
        slug: newSlug,
        parentId: data.parentId ?? null,
        imageUrl: imageUrl?.url ?? null,
        imagePublicId: imageUrl?.publicId ?? null,
      },
    });
  },

  update: async (
    id: number,
    data: UpdateCategoryInput,
    imageUrl?: ImageType,
  ) => {
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new AppError(MESSAGE.CATEGORY.NOT_FOUND, 404);
    }

    return prisma.category.update({
      where: { id },
      data: {
        name: data.name ?? category.name,
        slug: data.name ? slug.generate(data.name) : category.slug,
        imageUrl: imageUrl ? imageUrl.url : category.imageUrl,
        imagePublicId: imageUrl ? imageUrl.publicId : category.imagePublicId,
        parentId: data.parentId ?? category.parentId,
      },
    });
  },

  delete: async (id: number) => {
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new AppError(MESSAGE.CATEGORY.NOT_FOUND, 404);
    }

    await prisma.category.delete({
      where: { id },
    });
  },
};
