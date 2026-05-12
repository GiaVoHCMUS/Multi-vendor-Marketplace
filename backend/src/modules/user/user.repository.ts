import { PrismaQueryHelper } from '@/shared/query/prisma-query.helper';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { User, Prisma, PrismaClient, UserRole } from '@prisma/client';

export class UserRepository extends BaseRepository<
  User,
  Prisma.UserCreateInput,
  Prisma.UserUpdateInput,
  Prisma.UserFindManyArgs,
  Prisma.UserWhereInput
> {
  constructor() {
    super('user');
  }

  // Định nghĩa các trường mặc định muốn trả về cho Profile để dùng chung
  private readonly profileSelect = {
    id: true,
    email: true,
    role: true,
    fullName: true,
    avatarUrl: true,
    bio: true,
  };

  async getProfileById(id: string) {
    return this.findById(id, {
      select: this.profileSelect,
    });
  }

  async createUser(data: Prisma.UserCreateInput) {
    return this.create(data, {
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        avatarUrl: true,
        bio: true,
      },
    });
  }

  async updateUser(id: string, data: Prisma.UserUpdateInput) {
    return this.update(id, data, {
      select: this.profileSelect,
    });
  }

  async updatePassword(id: string, password: string) {
    return this.update(id, { password }, { select: this.profileSelect });
  }

  async findByEmail(email: string) {
    return this.findOne({ email, deletedAt: null });
  }

  async markEmailAsVerified(userId: string) {
    return this.update(userId, {
      isVerified: true,
    });
  }

  async softDeleteUser(userId: string) {
    return this.update(userId, {
      deletedAt: new Date(),
    });
  }

  async countActiveUsers() {
    return this.count({ deletedAt: null });
  }

  async findUsersForAdmin(queryInput: any) {
    const queryHelper = new PrismaQueryHelper(queryInput)
      .paginate()
      .applyFilter((q) => ({
        deletedAt: null,
        ...(q.search && {
          OR: [
            { email: { contains: q.search, mode: 'insensitive' } },
            { fullName: { contains: q.search, mode: 'insensitive' } },
          ],
        }),
      }))
      .sort();

    const { prismaArgs, meta } = queryHelper.build();

    const prismaUser = (this.client as PrismaClient).user;

    const [users, total] = await Promise.all([
      prismaUser.findMany({
        ...prismaArgs,
        orderBy: prismaArgs.orderBy ?? { createdAt: 'desc' },
      }),
      prismaUser.count({ where: prismaArgs.where }),
    ]);

    return { users, total, meta };
  }

  async updateRole(userId: string, role: UserRole) {
    return this.update(userId, { role });
  }
}
