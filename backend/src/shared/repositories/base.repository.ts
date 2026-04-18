import { prisma } from '@/core/config/prisma';
import { Prisma, PrismaClient } from '@prisma/client';

export abstract class BaseRepository<T, CreateInput, UpdateInput, Args, W> {
  protected modelName: keyof PrismaClient;
  protected client: PrismaClient | Prisma.TransactionClient;

  constructor(modelName: keyof PrismaClient) {
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

  async findById(id: string | number, args?: Args): Promise<T | null> {
    return await this.modelDelegate.findUnique({
      where: { id },
      ...args,
    });
  }

  // Tìm một bản ghi theo điều kiện bất kỳ (where)
  async findOne(where: W, args?: Args): Promise<T | null> {
    return await this.modelDelegate.findFirst({
      where,
      ...args,
    });
  }

  async findAll(where: W, args?: Args): Promise<T[]> {
    return await this.modelDelegate.findMany({ where, ...args });
  }

  async create(data: CreateInput, args?: Args): Promise<T> {
    return await this.modelDelegate.create({ data, ...args });
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

  // Soft delete hoặc Hard delete tùy bạn, ở đây tôi để delete gốc
  async delete(id: string | number): Promise<T> {
    return await this.modelDelegate.delete({ where: { id } });
  }

  async count(where?: W): Promise<number> {
    return await this.modelDelegate.count({ where });
  }
}
