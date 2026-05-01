import { CartRepository } from './cart.repository';
import { RedisClientType } from 'redis';

const CART_TTL = 7 * 24 * 60 * 60;

export class RedisCartRepository implements CartRepository {
  private readonly redis: RedisClientType;

  constructor(redis: RedisClientType) {
    this.redis = redis;
  }

  private getKey(userId: string): string {
    return `marketplace:cart:${userId}`;
  }

  async getAll(userId: string): Promise<Record<string, string>> {
    return this.redis.hGetAll(this.getKey(userId));
  }

  async get(userId: string, productId: string): Promise<string | null> {
    return this.redis.hGet(this.getKey(userId), productId);
  }

  async increment(userId: string, productId: string, quantity: number): Promise<void> {
    await this.redis.hIncrBy(this.getKey(userId), productId, quantity);
  }

  async set(userId: string, productId: string, quantity: number): Promise<void> {
    await this.redis.hSet(this.getKey(userId), productId, quantity);
  }

  async exists(userId: string, productId: string): Promise<number> {
    return this.redis.hExists(this.getKey(userId), productId);
  }

  async remove(userId: string, productId: string): Promise<void> {
    await this.redis.hDel(this.getKey(userId), productId);
  }

  async clear(userId: string): Promise<void> {
    await this.redis.del(this.getKey(userId));
  }

  async setTTL(userId: string): Promise<void> {
    await this.redis.expire(this.getKey(userId), CART_TTL);
  }
}
