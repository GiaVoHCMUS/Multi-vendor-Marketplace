import { ShopService } from './shop.service';
import { ShopRepository } from './shop.repository';
import { ShopController } from './shop.controller';
import { OrderService } from '../order/order.service';
import { OrderRepository } from '../order/order.repository';
import { RedisCartRepository } from '../cart/repositories/redis-cart.cache';
import { ProductRepository } from '../products/repositories/product.repository';
import { UserRepository } from '../user/user.repository';
import { ProductCacheRepository } from '../products/repositories/product.cache';
import { redisClient } from '@/core/redis/redis.client';

const redis = redisClient.getInstance();

const shopService = new ShopService(new ShopRepository());
const orderService = new OrderService(
  new RedisCartRepository(redis),
  new ProductRepository(),
  new OrderRepository(),
  new UserRepository(),
  new ProductCacheRepository(redis),
);

export const shopController = new ShopController(shopService, orderService);
