import { TransactionManager } from '@/core/database/transaction-manager';
import { OrderRepository } from '../order/repositories/order.repository';
import { ShopRepository } from '../shop/shop.repository';
import { UserRepository } from '../user/user.repository';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { prisma } from '@/core/config/prisma';

const adminService = new AdminService(
  new ShopRepository(),
  new UserRepository(),
  new OrderRepository(),
  new TransactionManager(prisma),
);

export const adminController = new AdminController(adminService);
