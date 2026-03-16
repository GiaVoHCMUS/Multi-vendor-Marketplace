import { redisClient } from '@/core/cache/redis';
import { AddToCartInput } from './cart.type';
import { prisma } from '@/core/config/prisma';
import { AppError } from '@/shared/utils/AppError';

const redis = redisClient.getInstance();
const getCartKey = (userId: string) => `cart:${userId}`;

export const cartService = {
  getCart: async (userId: string) => {
    const items = await redis.hGetAll(getCartKey(userId));

    const cartItems = Object.entries(items).map(([productId, quantity]) => ({
      productId,
      quantity: Number(quantity),
    }));

    return { items: cartItems };
  },

  addToCart: async (userId: string, item: AddToCartInput) => {
    const product = await prisma.product.findFirst({
      where: {
        id: item.productId,
        deletedAt: null,
        status: 'PUBLISHED',
      },
    });

    if (!product) {
      throw new AppError('Sản phẩm không tồn tại', 404);
    }

    await redis.hIncrBy(getCartKey(userId), item.productId, item.quantity);

    return cartService.getCart(userId);
  },

  updateItem: async (userId: string, productId: string, quantity: number) => {
    const exists = await redis.hExists(getCartKey(userId), productId);

    if (!exists) {
      throw new AppError('Sản phẩm không có trong giỏ', 404);
    }

    await redis.hSet(getCartKey(userId), productId, quantity);

    return cartService.getCart(userId);
  },

  removeFromCart: async (userId: string, productId: string) => {
    await redis.hDel(getCartKey(userId), productId);

    return cartService.getCart(userId);
  },

  clearCart: async (userId: string) => {
    await redis.del(getCartKey(userId));
  },
};
