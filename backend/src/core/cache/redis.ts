import { createClient, RedisClientType } from 'redis';

type RedisClient = {
  client: RedisClientType | null;
  getInstance: () => RedisClientType;
};
export const redisClient: RedisClient = {
  client: null,
  getInstance() {
    // const url = `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;
    const url = process.env.REDIS_URL;
    if (!this.client) {
      this.client = createClient({ url });
      this.client.on('error', (error) => {
        console.log('Redis Client Error', error);
      });
      this.client.connect().then(() => console.log('Redis Connected'));
    }

    return this.client;
  },
};
