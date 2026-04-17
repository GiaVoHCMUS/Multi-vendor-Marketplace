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

  async findByEmail(email: string) {
    return this.findOne({ email, deletedAt: null });
  }

  async markEmailAsVerified(userId: string) {
    return this.update(userId, {
      isVerified: true,
    });
  }
}

export const userRepository = new UserRepository();
