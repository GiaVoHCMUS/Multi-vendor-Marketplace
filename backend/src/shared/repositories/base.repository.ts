import { prisma } from '@/core/config/prisma';
import { Prisma, PrismaClient } from '@prisma/client';

export abstract class BaseRepository<T, CreateInput, UpdateInput, Args, W> {
  protected modelName: string;
  protected client: PrismaClient | Prisma.TransactionClient;

  constructor(modelName: string) {
    this.modelName = modelName;
    this.client = prisma;
  }

  // Tiện ích để lấy model delegate từ client hiện tại (hỗ trợ transaction)
  protected get modelDelegate() {
    return (this.client as any)[this.modelName];
  }

  /**
   * Chuyển repo sang chế độ Transaction
   */
  useTransaction(tx: Prisma.TransactionClient): this {
    const instance = Object.create(this);
    instance.client = tx;
    return instance;
  }

  async create(data: CreateInput, args?: Args): Promise<T> {
    return await this.modelDelegate.create({ data, ...args });
  }

  async findById(id: string | number, args?: Args): Promise<T | null> {
    return await this.modelDelegate.findUnique({
      where: { id },
      ...args,
    });
  }

  async update(
    id: string | number,
    data: UpdateInput,
    args?: Args,
  ): Promise<T> {
    return await this.modelDelegate.update({
      where: { id },
      data,
      ...args,
    });
  }

  async findAll(args?: Args): Promise<T[]> {
    return await this.modelDelegate.findMany(args);
  }

  // Soft delete hoặc Hard delete tùy bạn, ở đây tôi để delete gốc
  async delete(id: string | number): Promise<T> {
    return await this.modelDelegate.delete({ where: { id } });
  }

  async count(where?: W): Promise<number> {
    return await this.modelDelegate.count({ where });
  }

  // Tìm một bản ghi theo điều kiện bất kỳ (where)
  async findOne(where: W, args?: Args): Promise<T | null> {
    return await this.modelDelegate.findUnique({
      where,
      ...args,
    });
  }

  // Nếu muốn tìm theo các trường không phải Unique (trả về 1 cái đầu tiên tìm thấy)
  async findFirst(where: W, args?: Args): Promise<T | null> {
    return await this.modelDelegate.findFirst({
      where,
      ...args,
    });
  }
}
