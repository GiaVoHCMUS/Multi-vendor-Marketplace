import { redisClient } from '@/core/redis/redis.client';
import { RedisCartRepository } from '../cart/repositories/redis-cart.cache';
import { ProductCacheRepository } from '../products/repositories/product.cache';
import { ProductRepository } from '../products/repositories/product.repository';
import { UserRepository } from '../user/user.repository';
import { OrderController } from './order.controller';
import { OrderRepository } from './order.repository';
import { OrderService } from './order.service';

const redis = redisClient.getInstance();

const orderService = new OrderService(
  new RedisCartRepository(redis),
  new ProductRepository(),
  new OrderRepository(),
  new UserRepository(),
  new ProductCacheRepository(redis),
);

export const orderController = new OrderController(orderService)
