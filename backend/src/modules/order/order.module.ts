import { redisClient } from '@/core/redis/redis.client';
import { RedisCartRepository } from '../cart/repositories/redis-cart.cache';
import { ProductCacheRepository } from '../products/repositories/product.cache';
import { ProductRepository } from '../products/repositories/product.repository';
import { UserRepository } from '../user/user.repository';
import { OrderController } from './order.controller';
import { OrderRepository } from './repositories/order.repository';
import { OrderService } from './order.service';
import { TransactionManager } from '@/core/database/transaction-manager';
import { prisma } from '@/core/config/prisma';
import { OrderGroupRepository } from './repositories/order-group.repository';
import { OrderItemRepository } from './repositories/order-item.repository';
import { ShopRepository } from '../shop/shop.repository';
import { TransactionRepository } from '../payment/repositories/transaction.repository';

const redis = redisClient.getInstance();

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

export const orderController = new OrderController(orderService);
