import { RedisClientType } from 'redis';
import { CACHE_KEYS } from '@/shared/constants/cache.constants';

export class ProductCacheRepository {
  private readonly redis: RedisClientType;

  constructor(redis: RedisClientType) {
    this.redis = redis;
  }

  async invalidateCachesAfterCheckout(slugs: string[]) {
    const pipeline = this.redis.multi();

    // Xóa cache chi tiết của từng sản phẩm
    slugs.forEach((slug) => pipeline.del(CACHE_KEYS.PRODUCT.SLUG(slug)));

    // Tăng version tracker list (để reset cache danh sách sản phẩm)
    pipeline.incr(CACHE_KEYS.PRODUCT.TRACKER_LIST);

    await pipeline.exec();
  }
}
