import { AddToCartInput } from './cart.type';
import { AppError } from '@/shared/utils/AppError';
import { MESSAGE } from '@/shared/constants/message.constants';
import { StatusCodes } from 'http-status-codes';
import { CartRepository } from './repositories/cart.repository';
import { ProductRepository } from '../products/repositories/product.repository';

export class CartService {
  constructor(
    private readonly cartRepo: CartRepository,
    private readonly productRepo: ProductRepository,
  ) {}

  async getCart(userId: string) {
    const items = await this.cartRepo.getAll(userId);

    const cartItems = Object.entries(items ?? {}).map(([productId, quantity]) => ({
      productId,
      quantity: Number(quantity),
    }));

    if (cartItems.length === 0) {
      return { items: [], totalItems: 0, totalAmount: 0 };
    }

    // Lấy Product Information
    const productIds = cartItems.map((i) => i.productId);

    // const products = await this.productRepo.findPublishedByIds(productIds);
    const products = await this.productRepo.findPublishedByIds(productIds);
    const productMap = new Map(products.map((p) => [p.id, p]));
    let totalAmount: number = 0;

    const populatedItems = cartItems
      .map((item) => {
        const product = productMap.get(item.productId);
        if (!product) return null;

        const subTotal = Number(product.price) * item.quantity;
        totalAmount += subTotal;

        return {
          productId: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          stock: product.stock,
          quantity: item.quantity,
          subTotal,
          image: product.images[0]?.url ?? null,
          shop: product.shop,
          isAvailable: item.quantity <= product.stock,
        };
      })
      .filter((item) => item !== null);

    const totalItems = populatedItems.reduce((acc, item) => acc + item.quantity, 0);

    return { items: populatedItems, totalItems, totalAmount: Number(totalAmount.toFixed(2)) };
  }

  async addToCart(userId: string, item: AddToCartInput) {
    const product = await this.productRepo.findPublishedById(item.productId);

    if (!product) {
      throw new AppError(MESSAGE.CART.PRODUCT_NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    const currentQty = await this.cartRepo.get(userId, item.productId);
    const newQty = Number(currentQty ?? 0) + item.quantity;

    if (newQty > product.stock) {
      throw new AppError(MESSAGE.CART.QUANTITY_EXCEEDS_STOCK, StatusCodes.BAD_REQUEST);
    }

    await this.cartRepo.increment(userId, item.productId, item.quantity);
    await this.cartRepo.setTTL(userId);
  }

  async updateItem(userId: string, productId: string, quantity: number) {
    const exists = await this.cartRepo.exists(userId, productId);

    if (!exists) {
      throw new AppError(MESSAGE.CART.PRODUCT_NOT_IN_CART, StatusCodes.NOT_FOUND);
    }

    const product = await this.productRepo.findPublishedById(productId);

    if (!product) {
      throw new AppError(MESSAGE.CART.PRODUCT_NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    if (quantity > product.stock) {
      throw new AppError(MESSAGE.CART.QUANTITY_EXCEEDS_STOCK, StatusCodes.BAD_REQUEST);
    }

    await this.cartRepo.set(userId, productId, quantity);
    await this.cartRepo.setTTL(userId);
  }

  async removeFromCart(userId: string, productId: string) {
    await this.cartRepo.remove(userId, productId);
  }

  async clearCart(userId: string) {
    await this.cartRepo.clear(userId);
  }
}
