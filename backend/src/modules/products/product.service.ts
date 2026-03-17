import { ImageType } from '@/shared/types/image.type';
import {
  CreateProductInput,
  ProductQueryInput,
  UpdateProductInput,
} from './product.type';
import { prisma } from '@/core/config/prisma';
import { AppError } from '@/shared/utils/AppError';
import { slug } from '@/shared/utils/slug';
import { MESSAGE } from '@/shared/constants/message.constants';
import { ProductStatus } from '@prisma/client';

export const productService = {
  async getAll(queryInput: ProductQueryInput) {
    const limit = queryInput.limit;

    const [category, shop] = await Promise.all([
      queryInput.categorySlug
        ? prisma.category.findUnique({
            where: { slug: queryInput.categorySlug },
            select: { id: true },
          })
        : null,

      queryInput.shopSlug
        ? prisma.shop.findUnique({
            where: { slug: queryInput.shopSlug },
            select: { id: true },
          })
        : null,
    ]);

    if (
      (queryInput.shopSlug && !shop) ||
      (queryInput.categorySlug && !category)
    ) {
      return {
        data: [],
        meta: {
          limit,
          nextCursor: null,
          filters: queryInput,
        },
      };
    }

    const where: any = {
      deletedAt: null,
      status: ProductStatus.PUBLISHED,
    };

    // Search bằng contains của Prisma
    if (queryInput.search) {
      where.name = {
        contains: queryInput.search,
        mode: 'insensitive',
      };
    }

    // price
    if (queryInput.minPrice || queryInput.maxPrice) {
      where.price = {
        gte: queryInput.minPrice,
        lte: queryInput.maxPrice,
      };
    }

    // category
    if (category) {
      where.categoryId = category.id;
    }

    // shop
    if (shop) {
      where.shopId = shop.id;
    }

    // Query
    const products = await prisma.product.findMany({
      where,
      orderBy: {
        id: 'desc', // cursor-safe
      },
      take: limit + 1,

      cursor: queryInput.cursor ? { id: queryInput.cursor } : undefined,
      skip: queryInput.cursor ? 1 : 0,

      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        averageRating: true,

        images: {
          take: 1,
          orderBy: { order: 'asc' },
          select: { url: true },
        },

        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },

        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Pagination logic
    const hasNext = products.length > limit;
    const items = hasNext ? products.slice(0, -1) : products;

    // Format data
    const data = items.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      averageRating: p.averageRating,
      image: p.images[0]?.url || null,
      shop: p.shop,
      category: p.category,
    }));

    // Meta
    return {
      data,
      meta: {
        limit,
        nextCursor: hasNext ? items[items.length - 1].id : null,

        filters: {
          search: queryInput.search ?? null,
          minPrice: queryInput.minPrice ?? null,
          maxPrice: queryInput.maxPrice ?? null,
          categorySlug: queryInput.categorySlug ?? null,
          shopSlug: queryInput.shopSlug ?? null,
        },
      },
    };
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
      throw new AppError(MESSAGE.PRODUCT.NOT_FOUND, 404);
    }

    return product;
  },

  create: async (data: CreateProductInput, images: ImageType[]) => {
    const shop = await prisma.shop.findFirst({
      where: {
        id: data.shopId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!shop) {
      throw new AppError(MESSAGE.SHOP.NOT_FOUND, 404);
    }

    if (shop.status !== 'ACTIVE') {
      throw new AppError(MESSAGE.SHOP.NOT_ACTIVE, 403);
    }

    const category = await prisma.category.findUnique({
      where: {
        id: data.categoryId,
      },
    });

    if (!category) {
      throw new AppError(MESSAGE.CATEGORY.NOT_FOUND, 404);
    }

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
      throw new AppError(MESSAGE.PRODUCT.NOT_FOUND, 404);
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
      throw new AppError(MESSAGE.PRODUCT.NOT_FOUND, 404);
    }

    await prisma.product.delete({
      where: { id },
    });
  },
};
