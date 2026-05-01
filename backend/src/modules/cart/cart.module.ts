import { redisClient } from '@/core/redis/redis.client';
import { RedisCartRepository } from './repositories/redis-cart.cache';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';

const redis = redisClient.getInstance();

const cartRepository = new RedisCartRepository(redis);

const cartService = new CartService(cartRepository);

export const cartController = new CartController(cartService);

