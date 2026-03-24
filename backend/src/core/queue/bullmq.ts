import IORedis from 'ioredis';
import { env } from '../config/env';

class BullMQClient {
  private queueConnection: IORedis | null = null;
  private workerConnection: IORedis | null = null;

  private config = {
    host: env.REDIS_HOST || 'localhost',
    port: env.REDIS_PORT || 6379,
  };

  getQueueConnection() {
    if (!this.queueConnection) {
      this.queueConnection = new IORedis(this.config);
    }
    return this.queueConnection;
  }

  getWorkerConnection() {
    if (!this.workerConnection) {
      this.workerConnection = new IORedis({
        ...this.config,
        maxRetriesPerRequest: null,
      });
    }
    return this.workerConnection;
  }
}

export const bullmqClient = new BullMQClient();
