import { ImageType } from '@/shared/types/image.type';
import { CreateProductInput, UpdateProductInput } from './product.type';
import { prisma } from '@/core/config/prisma';
import { AppError } from '@/shared/utils/AppError';
import { slug } from '@/shared/utils/slug';

export const productService = {
  getAll: async () => {
    return prisma.product.findMany({
      include: {
        category: true,
        shop: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  getBySlug: async (slug: string) => {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        shop: true,
        reviews: true,
      },
    });

    if (!product) {
      throw new AppError('Không tìm thấy sản phẩm', 404);
    }

    return product;
  },

  create: async (data: CreateProductInput, images: ImageType[]) => {
    const newSlug = slug.generate(data.name);

    return prisma.product.create({
      data: {
        name: data.name,
        slug: newSlug,
        description: data.description ?? null,
        price: data.price,
        stock: data.stock,
        status: data.status,
        shopId: data.shopId,
        categoryId: data.categoryId,
        images: {
          create: images.map((img, index) => ({
            url: img.url,
            publicId: img.publicId,
            order: index,
          })),
        },
      },

      include: {
        images: true,
        category: true,
        shop: true,
      },
    });
  },

  update: async (
    id: string,
    data: UpdateProductInput,
    images?: ImageType[],
  ) => {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!product) {
      throw new AppError('Sản phẩm không tồn tại', 404);
    }

    return prisma.product.update({
      where: { id },

      data: {
        name: data.name ?? product.name,
        slug: data.name ? slug.generate(data.name) : product.slug,
        description: data.description ?? product.description,
        price: data.price ?? product.price,
        stock: data.stock ?? product.stock,
        status: data.status ?? product.status,
        categoryId: data.categoryId ?? product.categoryId,

        ...(images && {
          images: {
            deleteMany: {},

            create: images.map((img, index) => ({
              url: img.url,
              publicId: img.publicId,
              order: index,
            })),
          },
        }),
      },

      include: {
        images: true,
        category: true,
        shop: true,
      },
    });
  },

  delete: async (id: string) => {
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new AppError('Sản phẩm không tồn tại', 404);
    }

    await prisma.product.delete({
      where: { id },
    });
  },
};
