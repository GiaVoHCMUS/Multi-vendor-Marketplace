import { ImageType } from '@/shared/types/image.type';
import { CreateProductInput, ProductQueryInput, UpdateProductInput } from './product.type';
import { prisma } from '@/core/config/prisma';
import { AppError } from '@/shared/utils/AppError';
import { slug } from '@/shared/utils/slug';
import { MESSAGE } from '@/shared/constants/message.constants';
import { ProductStatus, ShopStatus } from '@prisma/client';
import { cacheService } from '@/shared/services/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '@/shared/constants/cache.constants';
import { PrismaQueryHelper } from '@/shared/query/prisma-query.helper';
import { cursorUtil } from '@/shared/utils/cursor';
import { StatusCodes } from 'http-status-codes';

export const productService = {
  async invalidateProductList() {
    // Tăng version -> Mọi query list sau đó sẽ bị cache miss và lấy data mới từ DB
    await cacheService.invalidateTracker(CACHE_KEYS.PRODUCT.TRACKER_LIST);
  },

  async getAll(queryInput: ProductQueryInput) {
    const { limit, cursor, categorySlug, shopSlug, search, minPrice, maxPrice, sort } = queryInput;

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
    const version = await cacheService.getTracker(CACHE_KEYS.PRODUCT.TRACKER_LIST);

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
        const { prismaArgs, meta } = new PrismaQueryHelper(queryInput)
          .cursorPaginate('id')
          .applyFilter(() => ({
            deletedAt: null,
            status: ProductStatus.PUBLISHED,

            // search
            ...(search && {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            }),

            // price
            ...(minPrice !== undefined || maxPrice !== undefined
              ? {
                  price: {
                    ...(minPrice !== undefined && { gte: minPrice }),
                    ...(maxPrice !== undefined && { lte: maxPrice }),
                  },
                }
              : {}),

            // category
            ...(category && { categoryId: category.id }),

            // shop
            ...(shop && { shopId: shop.id }),
          }))
          .build();

        // Query
        const products = await prisma.product.findMany({
          ...prismaArgs,

          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            averageRating: true,
            description: true,
            stock: true,
            status: true,

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

        // Xác định sortField để encode cursor
        let sortField = 'id';

        if (sort) {
          const [field] = sort.split(':');
          sortField = field;
        }

        let nextCursor: string | null = null;
        if (hasNext && items.length > 0) {
          const lastItem = items[items.length - 1];

          nextCursor = cursorUtil.encode({
            id: lastItem.id,
            [sortField]: (lastItem as any)[sortField],
          });
        }

        // Format data
        const data = items.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: p.price,
          averageRating: p.averageRating,
          image: p.images[0]?.url || null,
          description: p.description,
          stock: p.stock,
          status: p.status,
          shop: p.shop,
          category: p.category,
        }));

        if (!meta || meta.type !== 'cursor') {
          throw new AppError('Phân trang không hợp lệ', 400);
        }

        // Meta
        return {
          data,
          meta: {
            limit,
            nextCursor,

            filters: {
              search: search ?? null,
              minPrice: minPrice ?? null,
              maxPrice: maxPrice ?? null,
              categorySlug: categorySlug ?? null,
              shopSlug: shopSlug ?? null,
              sort: sort ?? null,
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
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            price: true,
            stock: true,
            averageRating: true,

            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                imageUrl: true,
                parentId: true,
              },
            },
            shop: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                logoUrl: true,
              },
            },
            reviews: true,
          },
        });

        if (!product) {
          throw new AppError(MESSAGE.PRODUCT.NOT_FOUND, StatusCodes.NOT_FOUND);
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
      throw new AppError(MESSAGE.SHOP.NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    if (shop.status !== ShopStatus.ACTIVE) {
      throw new AppError(MESSAGE.SHOP.NOT_ACTIVE, StatusCodes.FORBIDDEN);
    }

    const category = await prisma.category.findUnique({
      where: {
        id: data.categoryId,
      },
    });

    if (!category) {
      throw new AppError(MESSAGE.CATEGORY.NOT_FOUND, StatusCodes.NOT_FOUND);
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
      throw new AppError(MESSAGE.PRODUCT.NOT_FOUND, StatusCodes.NOT_FOUND);
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
      throw new AppError(MESSAGE.PRODUCT.NOT_FOUND, StatusCodes.NOT_FOUND);
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
