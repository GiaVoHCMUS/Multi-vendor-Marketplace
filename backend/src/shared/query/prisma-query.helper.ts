import { AppError } from '../utils/AppError';

type PaginationMeta =
  | {
      type: 'offset';
      page: number;
      limit: number;
    }
  | {
      type: 'cursor';
      limit: number;
      cursorField: string;
    };

export class PrismaQueryHelper<
  TWhereInput extends Record<string, any>,
  TOrderByInput = any,
> {
  private prismaQuery: {
    where?: Partial<TWhereInput>;
    orderBy?: TOrderByInput | TOrderByInput[];
    take?: number;
    skip?: number;
    cursor?: any;
  } = { where: {} as TWhereInput };

  private meta: PaginationMeta | null = null;

  constructor(private rawQuery: any) {}

  // Offset Pagination
  paginate() {
    const limit = Math.min(Number(this.rawQuery.limit) || 10, 100);
    const page = Math.max(Number(this.rawQuery.page) || 1, 1);

    this.prismaQuery.take = limit;
    this.prismaQuery.skip = (page - 1) * limit;

    this.meta = {
      type: 'offset',
      page,
      limit,
    };

    return this;
  }

  // Cursor Pagination
  cursorPaginate(cursorField: string = 'id') {
    const limit = Math.min(Number(this.rawQuery.limit) || 10, 100);
    const cursor = this.rawQuery.cursor;

    this.prismaQuery.take = limit;

    // Cursor pagination phải có thứ tự ổn định
    this.prismaQuery.orderBy = {
      [cursorField]: 'desc',
    } as TOrderByInput;

    if (cursor) {
      this.prismaQuery.cursor = { [cursorField]: cursor };
      this.prismaQuery.skip = 1;
    }

    this.meta = {
      type: 'cursor',
      limit,
      cursorField,
    };

    return this;
  }

  // Sort
  sort() {
    if (!this.rawQuery.sort) return this;

    if (this.meta?.type === 'cursor') {
      throw new AppError('Không thể sắp xếp với phân trang theo con trỏ', 400);
    }

    const parts = this.rawQuery.sort.split(',');

    const orderBy = parts
      .map((part: string) => {
        const [field, order] = part.split(':');
        if (!field) return null;

        return {
          [field]: order === 'desc' ? 'desc' : 'asc',
        };
      })
      .filter(Boolean);

    if (orderBy.length) {
      this.prismaQuery.orderBy = orderBy as TOrderByInput[];
    }

    return this;
  }

  applyFilter(callback: (query: any) => Partial<TWhereInput>) {
    const filterObj = callback(this.rawQuery);

    const cleaned = Object.fromEntries(
      Object.entries(filterObj as any).filter(
        ([_, v]) => v !== undefined && v !== '',
      ),
    ) as Partial<TWhereInput>;

    this.prismaQuery.where = {
      ...this.prismaQuery.where,
      ...cleaned,
    };

    return this;
  }

  build() {
    return {
      prismaArgs: this.prismaQuery,
      meta: this.meta,
    };
  }
}
