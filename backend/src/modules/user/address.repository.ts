import { BaseRepository } from '@/shared/repositories/base.repository';
import { Prisma, Address } from '@prisma/client';
import { CreateAddressInput } from './user.type';

class AddressRepository extends BaseRepository<
  Address,
  Prisma.AddressCreateInput | Prisma.AddressUncheckedCreateInput,
  Prisma.AddressUpdateInput,
  Prisma.AddressFindManyArgs,
  Prisma.AddressWhereInput
> {
  constructor() {
    super('address');
  }

  async createAddress(userId: string, data: CreateAddressInput) {
    return this.create({ userId, ...data }, { omit: { createdAt: true } });
  }

  async getUserAddress(userId: string) {
    return this.findAll(
      { userId },
      {
        omit: {
          userId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    );
  }

  async findAddressByUserId(addressId: string, userId: string) {
    return this.findOne(
      { id: addressId, userId },
      { omit: { createdAt: true, userId: true } },
    );
  }

  async clearDefaultStatus(userId: string) {
    return this.modelDelegate.updateMany({
      where: { userId },
      data: { isDefault: false },
    });
  }

  async updateAddressById(addressId: string, data: Prisma.AddressUpdateInput) {
    return this.update(addressId, data, { omit: { createdAt: true } });
  }

  async deleteAddress(addressId: string) {
    return this.delete(addressId);
  }
}

export const addressRepository = new AddressRepository();
