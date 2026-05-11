import { TransactionManger } from '@/shared/database/transaction-manager';
import { OrderRepository } from '../order/order.repository';
import { ShopRepository } from '../shop/shop.repository';
import { UserRepository } from '../user/user.repository';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { prisma } from '@/core/config/prisma';

const adminService = new AdminService(
  new ShopRepository(),
  new UserRepository(),
  new OrderRepository(),
  new TransactionManger(prisma),
);

export const adminController = new AdminController(adminService);
