import { redisClient } from '@/core/redis/redis.client';
import { RedisCartRepository } from './repositories/redis-cart.cache';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { ProductRepository } from '../products/repositories/product.repository';

const redis = redisClient.getInstance();

const cartRepository = new RedisCartRepository(redis);

const cartService = new CartService(cartRepository, new ProductRepository());

export const cartController = new CartController(cartService);
