import { Prisma } from "@prisma/client";

export interface IRepository<T, CreateInput, UpdateInput, Args, W> {
  // Tìm kiếm
  findById(id: string | number, args?: Args): Promise<T | null>;
  findOne(where: W, args?: Args): Promise<T | null>;
  findAll(where?: W, args?: Args): Promise<T[]>;

  // Hành động (Create, Update, Delete)
  create(data: CreateInput, args?: Args): Promise<T>;
  update(id: string | number, data: UpdateInput, args?: Args): Promise<T>;
  delete(id: string | number): Promise<T>;

  // Tiện ích
  count(where?: W): Promise<number>;

  // Hỗ trợ Transaction
  useTransaction(tx: Prisma.TransactionClient): this;
}