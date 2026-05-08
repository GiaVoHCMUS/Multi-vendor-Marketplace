import { OrderRepository } from '../order/order.repository';
import { ShopRepository } from '../shop/shop.repository';
import { UserRepository } from '../user/user.repository';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

const adminService = new AdminService(
  new ShopRepository(),
  new UserRepository(),
  new OrderRepository(),
);

export const adminController = new AdminController(adminService);
