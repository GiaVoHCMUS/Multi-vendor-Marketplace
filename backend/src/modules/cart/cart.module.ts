import { redisClient } from '@/core/redis/redis.client';
import { RedisCartRepository } from './repositories/redis-cart.cache';
import { CartService } from './cart.service';

const redis = redisClient.getInstance();

const cartRepository = new RedisCartRepository(redis);

export const cartService = new CartService(cartRepository);
