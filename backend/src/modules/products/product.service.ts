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
import { cacheService } from '@/core/cache/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '@/shared/constants/cache.constants';

export const productService = {
  async invalidateProductList() {
    // Tăng version -> Mọi query list sau đó sẽ bị cache miss và lấy data mới từ DB
    await cacheService.invalidateTracker(CACHE_KEYS.PRODUCT.TRACKER_LIST);
  },
  async getAll(queryInput: ProductQueryInput) {
    const {
      limit,
      cursor,
      categorySlug,
      shopSlug,
      search,
      minPrice,
      maxPrice,
    } = queryInput;

    const [category, shop] = await Promise.all([
      categorySlug
        ? cacheService.getOrSet(
            CACHE_KEYS.CATEGORY.ID_BY_SLUG(categorySlug),
            () =>
              prisma.category.findUnique({
                where: { slug: categorySlug },
                select: { id: true },
              }),
            CACHE_TTL.LONG,
          )
        : null,

      shopSlug
        ? cacheService.getOrSet(
            CACHE_KEYS.SHOP.ID_BY_SLUG(shopSlug),
            () =>
              prisma.shop.findUnique({
                where: { slug: shopSlug },
                select: { id: true },
              }),
            CACHE_TTL.LONG,
          )
        : null,
    ]);

    if ((shopSlug && !shop) || (categorySlug && !category)) {
      return {
        data: [],
        meta: {
          limit,
          nextCursor: null,
          filters: queryInput,
        },
      };
    }

    // Lấy Versioning cho List Product
    const version = await cacheService.getTracker(
      CACHE_KEYS.PRODUCT.TRACKER_LIST,
    );

    // Hàm Helper để sort object keys
    const sortObject = (obj: any) =>
      Object.keys(obj)
        .sort()
        .reduce((res: any, key) => {
          res[key] = obj[key];
          return res;
        }, {});

    // Tạo unique key dựa trên các tham số filter và IDs
    const cacheKey = CACHE_KEYS.PRODUCT.LIST(
      version,
      JSON.stringify(
        sortObject({
          ...queryInput,
          categoryId: category?.id,
          shopId: shop?.id,
        }),
      ),
    );

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const where: any = {
          deletedAt: null,
          status: ProductStatus.PUBLISHED,
        };

        // Search bằng contains của Prisma
        if (search) {
          where.name = {
            contains: search,
            mode: 'insensitive',
          };
        }

        // price
        if (minPrice || maxPrice) {
          where.price = {
            gte: minPrice,
            lte: maxPrice,
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

          cursor: cursor ? { id: cursor } : undefined,
          skip: cursor ? 1 : 0,

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
              search: search ?? null,
              minPrice: minPrice ?? null,
              maxPrice: maxPrice ?? null,
              categorySlug: categorySlug ?? null,
              shopSlug: shopSlug ?? null,
            },
          },
        };
      },
      CACHE_TTL.SHORT,
    );
  },

  getBySlug: async (slug: string) => {
    return cacheService.getOrSet(
      CACHE_KEYS.PRODUCT.SLUG(slug),
      async () => {
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
      CACHE_TTL.LONG,
    );
  },

  async create(data: CreateProductInput, images: ImageType[]) {
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

    await this.invalidateProductList();

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

  async update(id: string, data: UpdateProductInput, images?: ImageType[]) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!product) {
      throw new AppError(MESSAGE.PRODUCT.NOT_FOUND, 404);
    }

    const updatedProduct = await prisma.product.update({
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

    await Promise.all([
      this.invalidateProductList(),
      cacheService.delete(CACHE_KEYS.PRODUCT.SLUG(product.slug)),
    ]);

    return updatedProduct;
  },

  async delete(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new AppError(MESSAGE.PRODUCT.NOT_FOUND, 404);
    }

    await prisma.product.delete({
      where: { id },
    });

    await Promise.all([
      this.invalidateProductList(),
      cacheService.delete(CACHE_KEYS.PRODUCT.SLUG(product.slug)),
    ]);
  },
};
