import { BaseRepository } from '@/shared/repositories/base.repository';
import { Category, Prisma } from '@prisma/client';
import { CreateCategoryInput } from './category.type';
import { ImageType } from '@/shared/types/image.type';
import { slug } from '@/shared/utils/slug';

class CategoryRepository extends BaseRepository<
  Category,
  Prisma.CategoryCreateInput,
  Prisma.CategoryUpdateInput,
  Prisma.CategoryFindManyArgs,
  Prisma.CategoryWhereInput
> {
  constructor() {
    super('category');
  }

  private readonly categorySelect = {
    id: true,
    name: true,
    slug: true,
    imageUrl: true,
    parent: true,
    children: true,
  };

  async getAll() {
    return this.findAll(
      {},
      {
        orderBy: { id: 'desc' },
        select: this.categorySelect,
      },
    );
  }

  async getBySlug(slug: string) {
    return this.findOne({ slug }, { select: this.categorySelect });
  }

  async createCategoryById(data: CreateCategoryInput, imageUrl?: ImageType) {
    return this.create(
      {
        ...data,
        slug: slug.generate(data.name),
        imageUrl: imageUrl?.url,
        imagePublicId: imageUrl?.publicId,
      },
      { select: this.categorySelect },
    );
  }

  async updateCategoryById(id: number, data: Prisma.CategoryUpdateInput) {
    return this.update(id, data, { select: this.categorySelect });
  }

  async deleteCategoryById(id: number) {
    return this.delete(id);
  }
}

export const categoryRepository = new CategoryRepository();
