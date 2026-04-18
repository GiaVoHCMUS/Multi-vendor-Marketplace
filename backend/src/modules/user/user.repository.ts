import { BaseRepository } from '@/shared/repositories/base.repository';
import { User, Prisma } from '@prisma/client';

class UserRepository extends BaseRepository<
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
    return this.findOne(
      { email, deletedAt: null },
    );
  }

  async markEmailAsVerified(userId: string) {
    return this.update(userId, {
      isVerified: true,
    });
  }
}

export const userRepository = new UserRepository();
