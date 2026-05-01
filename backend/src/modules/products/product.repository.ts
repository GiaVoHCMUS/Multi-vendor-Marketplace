import { PrismaQueryHelper } from '@/shared/query/prisma-query.helper';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { Prisma, Product, ProductStatus } from '@prisma/client';
import { GetProductsQuery } from './product.type';

class ProductRepository extends BaseRepository<
  Product,
  Prisma.ProductCreateInput,
  Prisma.ProductUpdateInput,
  Prisma.ProductFindManyArgs,
  Prisma.ProductWhereInput
> {
  constructor() {
    super('product');
  }

  /**
   * Định nghĩa các trường trả về mặc định cho Product
   */
  private readonly productSelect: Prisma.ProductSelect = {
    id: true,
    name: true,
    slug: true,
    description: true,
    price: true,
    stock: true,
    status: true,
    averageRating: true,

    // Lấy kèm ảnh (mặc định lấy hết hoặc giới hạn tùy ý)
    images: {
      select: {
        id: true,
        url: true,
        order: true,
      },
      orderBy: { order: 'asc' },
    },

    // Lấy kèm thông tin category cơ bản
    category: {
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
      },
    },

    // Lấy kèm thông tin shop cơ bản
    shop: {
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
      },
    },
  };

  private readonly productWtthReviewsSelect: Prisma.ProductSelect = {
    ...this.productSelect,
    reviews: true,
  };

  async findProductById(id: string) {
    return this.findById(id, { include: { images: true } });
  }

  async findProductBySlug(slug: string) {
    return this.findOne({ slug, deletedAt: null }, { select: this.productWtthReviewsSelect });
  }

  async findPublishedById(productId: string) {
    return this.findOne({
      id: productId,
      deletedAt: null,
      status: ProductStatus.PUBLISHED,
    });
  }
  async findPublishedByIds(productIds: string[]) {
    // 1. Định nghĩa cấu trúc query để Prisma helper có thể tính toán Type
    const queryOptions = {
      include: {
        images: { orderBy: { order: 'asc' } as const, take: 1 },
        shop: { select: { id: true, name: true, slug: true } },
      },
    } satisfies Prisma.ProductFindManyArgs;

    // 2. Tạo Type từ cấu trúc query trên
    type ProductWithRelations = Prisma.ProductGetPayload<typeof queryOptions>;

    // 3. Gọi hàm findAll và ép kiểu trả về (As)
    // Vì BaseRepository trả về Product[], chúng ta cần cast qua unknown rồi mới qua type mong muốn
    const products = await this.findAll(
      {
        id: { in: productIds },
        deletedAt: null,
        status: ProductStatus.PUBLISHED,
      },
      queryOptions,
    );

    return products as unknown as ProductWithRelations[];
  }

  async findProductList(
    queryInput: GetProductsQuery,
    extraFilters: { categoryId?: number; shopId?: string },
  ) {
    const { search, minPrice, maxPrice } = queryInput;

    const queryHelper = new PrismaQueryHelper(queryInput).cursorPaginate('id').applyFilter(() => ({
      status: ProductStatus.PUBLISHED,
      deletedAt: null,
      // Logic search
      ...(search && { name: { contains: search, mode: 'insensitive' } }),

      // Logic giá
      ...((minPrice !== undefined || maxPrice !== undefined) && {
        price: {
          ...(minPrice !== undefined && { gte: minPrice }),
          ...(maxPrice !== undefined && { lte: maxPrice }),
        },
      }),

      // Logic Category & Shop (đã được resolve từ service)
      ...(extraFilters.categoryId && { categoryId: extraFilters.categoryId }),
      ...(extraFilters.shopId && { shopId: extraFilters.shopId }),
    }));

    const { prismaArgs, meta } = queryHelper.build();

    const products = await this.modelDelegate.findMany({
      ...prismaArgs,
      select: this.productSelect,
    });

    return { products, meta };
  }

  async createProduct(data: Prisma.ProductCreateInput) {
    return this.create(data, { select: this.productSelect });
  }

  async updateProduct(id: string, data: Prisma.ProductUpdateInput) {
    return this.update(id, data, {
      select: this.productSelect,
    });
  }
}

export const productRepository = new ProductRepository();
