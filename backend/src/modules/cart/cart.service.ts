import { redisClient } from '@/core/cache/redis';
import { AddToCartInput } from './cart.type';
import { prisma } from '@/core/config/prisma';
import { AppError } from '@/shared/utils/AppError';
import { MESSAGE } from '@/shared/constants/message.constants';
import { ProductStatus } from '@prisma/client';

const redis = redisClient.getInstance();
const CART_TTL = 7 * 24 * 60 * 60;
const getCartKey = (userId: string) => `maketplace:cart:${userId}`;

export const cartService = {
  async getCart(userId: string) {
    const items = await redis.hGetAll(getCartKey(userId));

    const cartItems = Object.entries(items ?? {}).map(
      ([productId, quantity]) => ({
        productId,
        quantity: Number(quantity),
      }),
    );

    if (cartItems.length === 0) {
      return { cartItems: [], totalItems: 0 };
    }

    // Lấy Product Information
    const productIds = cartItems.map((i) => i.productId);

    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        deletedAt: null,
        status: ProductStatus.PUBLISHED,
      },
      include: {
        images: {
          orderBy: { order: 'asc' },
          take: 1,
        },
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    const populatedItems = cartItems
      .map((item) => {
        const product = productMap.get(item.productId);

        if (!product) return null;

        return {
          productId: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          stock: product.stock,
          quantity: item.quantity,
          image: product.images[0]?.url ?? null,
          shop: product.shop,
        };
      })
      .filter((item) => item !== null);

    const totalItems = populatedItems.reduce(
      (acc, item) => acc + item.quantity,
      0,
    );

    return { items: populatedItems, totalItems };
  },

  async addToCart(userId: string, item: AddToCartInput) {
    const product = await prisma.product.findFirst({
      where: {
        id: item.productId,
        deletedAt: null,
        status: ProductStatus.PUBLISHED,
      },
    });

    if (!product) {
      throw new AppError(MESSAGE.CART.PRODUCT_NOT_FOUND, 404);
    }

    const cartKey = getCartKey(userId);

    const currentQty = await redis.hGet(cartKey, item.productId);
    const newQty = Number(currentQty ?? 0) + item.quantity;

    if (newQty > product.stock) {
      throw new AppError(MESSAGE.CART.QUANTITY_EXCEEDS_STOCK, 400);
    }

    await redis.hIncrBy(cartKey, item.productId, item.quantity);

    await redis.expire(cartKey, CART_TTL);
  },

  async updateItem(userId: string, productId: string, quantity: number) {
    const cartKey = getCartKey(userId);

    const exists = await redis.hExists(cartKey, productId);

    if (!exists) {
      throw new AppError(MESSAGE.CART.PRODUCT_NOT_IN_CART, 404);
    }

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        deletedAt: null,
        status: ProductStatus.PUBLISHED,
      },
    });

    if (!product) {
      throw new AppError(MESSAGE.CART.PRODUCT_NOT_IN_CART, 404);
    }

    if (quantity > product.stock) {
      throw new AppError(MESSAGE.CART.QUANTITY_EXCEEDS_STOCK, 400);
    }

    await redis.hSet(cartKey, productId, quantity);

    await redis.expire(cartKey, CART_TTL);
  },

  async removeFromCart(userId: string, productId: string) {
    const cartKey = getCartKey(userId);

    await redis.hDel(cartKey, productId);
  },

  async clearCart(userId: string) {
    await redis.del(getCartKey(userId));
  },
};
