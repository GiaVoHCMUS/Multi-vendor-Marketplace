import { CACHE_KEYS, CACHE_TTL } from '@/shared/constants/cache.constants';
import { MESSAGE } from '@/shared/constants/message.constants';
import { cacheService } from '@/shared/services/cache.service';
import { ImageType } from '@/shared/types/image.type';
import { AppError } from '@/shared/utils/AppError';
import { cursorUtil } from '@/shared/utils/cursor';
import { slugHelper } from '@/shared/utils/slug';
import { sortObject } from '@/shared/utils/sortObject';
import { Prisma, ShopStatus } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { CategoryRepository } from '../category/category.repository';
import { ShopRepository } from '../shop/shop.repository';
import { ProductRepository } from './repositories/product.repository';
import { CreateProductInput, GetProductsQuery, UpdateProductInput } from './product.type';

export class ProductService {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly categoryRepo: CategoryRepository,
    private readonly shopRepo: ShopRepository,
  ) {}
  async invalidateProductList() {
    // Tăng version -> Mọi query list sau đó sẽ bị cache miss và lấy data mới từ DB
    await cacheService.invalidateTracker(CACHE_KEYS.PRODUCT.TRACKER_LIST);
  }

  async getAll(queryInput: GetProductsQuery) {
    const { limit, categorySlug, shopSlug, search, minPrice, maxPrice, sort } = queryInput;

    const [category, shop] = await Promise.all([
      categorySlug
        ? cacheService.getOrSet(
            CACHE_KEYS.CATEGORY.ID_BY_SLUG(categorySlug),
            () => this.categoryRepo.getBySlug(categorySlug),
            CACHE_TTL.LONG,
          )
        : null,

      shopSlug
        ? cacheService.getOrSet(
            CACHE_KEYS.SHOP.ID_BY_SLUG(shopSlug),
            () => this.shopRepo.findShopBySlug(shopSlug),
            CACHE_TTL.LONG,
          )
        : null,
    ]);

    if ((shopSlug && !shop) || (categorySlug && !category)) {
      return {
        data: [],
        meta: { limit, nextCursor: null, filters: queryInput },
      };
    }

    // Lấy Versioning cho List Product
    const version = await cacheService.getTracker(CACHE_KEYS.PRODUCT.TRACKER_LIST);

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
        const categoryId = category ? category.id : undefined;
        const shopId = shop ? shop.id : undefined;
        const extraFilters = { categoryId, shopId };

        const { products, meta } = await this.productRepo.findProductList(queryInput, extraFilters);

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

        if (!meta || meta.type !== 'cursor') {
          throw new AppError(MESSAGE.COMMON.INVALID_PAGINATION, 400);
        }

        // Meta
        return {
          data: items,
          meta: {
            limit,
            nextCursor,

            filters: {
              search,
              minPrice,
              maxPrice,
              categorySlug,
              shopSlug,
              sort,
            },
          },
        };
      },
      CACHE_TTL.SHORT,
    );
  }

  async getBySlug(slug: string) {
    return cacheService.getOrSet(
      CACHE_KEYS.PRODUCT.SLUG(slug),
      async () => {
        const product = await this.productRepo.findProductBySlug(slug);

        if (!product) {
          throw new AppError(MESSAGE.PRODUCT.NOT_FOUND, StatusCodes.NOT_FOUND);
        }

        return product;
      },
      CACHE_TTL.LONG,
    );
  }

  async create(userId: string, data: CreateProductInput, images: ImageType[]) {
    const shop = await this.shopRepo.findShopByOwerId(userId);

    if (!shop) {
      throw new AppError(MESSAGE.SHOP.NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    if (shop.status !== ShopStatus.ACTIVE) {
      throw new AppError(MESSAGE.SHOP.NOT_ACTIVE, StatusCodes.FORBIDDEN);
    }

    const category = await this.categoryRepo.findById(data.categoryId);

    if (!category) {
      throw new AppError(MESSAGE.CATEGORY.NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    const createData: Prisma.ProductCreateInput = {
      name: data.name,
      slug: slugHelper.generate(data.name),
      description: data.description,
      price: data.price,
      stock: data.stock,
      status: data.status,
      thumbnailUrl: images[0].url,

      shop: { connect: { id: shop.id } },
      category: { connect: { id: data.categoryId } },
      images: {
        create: images.map((img, index) => ({
          url: img.url,
          publicId: img.publicId,
          order: index,
        })),
      },
    };

    await this.invalidateProductList();

    return this.productRepo.createProduct(createData);
  }

  async update(id: string, data: UpdateProductInput, images?: ImageType[]) {
    const product = await this.productRepo.findProductById(id);

    if (!product) {
      throw new AppError(MESSAGE.PRODUCT.NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    const updateData: Prisma.ProductUpdateInput = {
      ...data,
      slug: data.name ? slugHelper.generate(data.name) : product.slug,
      ...(images && {
        thumbnailUrl: images[0].url,

        images: {
          deleteMany: {},

          create: images.map((img, index) => ({
            url: img.url,
            publicId: img.publicId,
            order: index,
          })),
        },
      }),
    };

    const updatedProduct = await this.productRepo.updateProduct(id, updateData);

    await Promise.all([
      this.invalidateProductList(),
      cacheService.delete(CACHE_KEYS.PRODUCT.SLUG(product.slug)),
    ]);

    return updatedProduct;
  }

  async delete(id: string) {
    const product = await this.productRepo.findProductById(id);

    if (!product) {
      throw new AppError(MESSAGE.PRODUCT.NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    await this.productRepo.delete(id);

    await Promise.all([
      this.invalidateProductList(),
      cacheService.delete(CACHE_KEYS.PRODUCT.SLUG(product.slug)),
    ]);
  }
}
