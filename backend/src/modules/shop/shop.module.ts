import { ShopService } from './shop.service';
import { ShopRepository } from './shop.repository';
import { ShopController } from './shop.controller';
import { OrderService } from '../order/order.service';
import { OrderRepository } from '../order/repositories/order.repository';
import { RedisCartRepository } from '../cart/repositories/redis-cart.cache';
import { ProductRepository } from '../products/repositories/product.repository';
import { UserRepository } from '../user/user.repository';
import { ProductCacheRepository } from '../products/repositories/product.cache';
import { redisClient } from '@/core/redis/redis.client';
import { TransactionManager } from '@/core/database/transaction-manager';
import { OrderGroupRepository } from '../order/repositories/order-group.repository';
import { OrderItemRepository } from '../order/repositories/order-item.repository';
import { TransactionRepository } from '../payment/repositories/transaction.repository';
import { prisma } from '@/core/config/prisma';

const redis = redisClient.getInstance();

const shopService = new ShopService(new ShopRepository());
const orderService = new OrderService(
  new RedisCartRepository(redis),
  new ProductRepository(),
  new OrderRepository(),
  new UserRepository(),
  new ProductCacheRepository(redis),
  new TransactionManager(prisma),
  new OrderGroupRepository(),
  new OrderItemRepository(),
  new ShopRepository(),
  new TransactionRepository(),
);

export const shopController = new ShopController(shopService, orderService);
