import { CheckoutInput } from './order.type';
import { AppError } from '@/shared/utils/AppError';
import { OrderStatus, PaymentMethod } from '@prisma/client';
import { MESSAGE } from '@/shared/constants/message.constants';
import { buildOffsetMeta } from '@/shared/utils/buildMeta';
import { mailJob } from '@/jobs/mail/mail.job';
import { paymentService } from '../payment/payment.service';
import { StatusCodes } from 'http-status-codes';
import { OrderRepository } from './order.repository';
import { RedisCartRepository } from '../cart/repositories/redis-cart.cache';
import { ProductRepository } from '../products/repositories/product.repository';
import { UserRepository } from '../user/user.repository';
import { ProductCacheRepository } from '../products/repositories/product.cache';
import { cacheService } from '@/shared/services/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '@/shared/constants/cache.constants';

export class OrderService {
  private readonly cartRepo: RedisCartRepository;
  private readonly productRepo: ProductRepository;
  private readonly orderRepo: OrderRepository;
  private readonly userRepo: UserRepository;
  private readonly productCacheRepo: ProductCacheRepository;

  constructor(
    cartRepo: RedisCartRepository,
    productRepo: ProductRepository,
    orderRepo: OrderRepository,
    userRepo: UserRepository,
    productCacheRepo: ProductCacheRepository,
  ) {
    this.cartRepo = cartRepo;
    this.productRepo = productRepo;
    this.orderRepo = orderRepo;
    this.userRepo = userRepo;
    this.productCacheRepo = productCacheRepo;
  }

  async checkout(userId: string, ipAddr: string, data: CheckoutInput) {
    const user = await this.userRepo.getProfileById(userId);

    if (!user) {
      throw new AppError(MESSAGE.USER.NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    const items = await this.cartRepo.getAll(userId);

    const cartItems = Object.entries(items ?? {}).map(([productId, quantity]) => ({
      productId,
      quantity: Number(quantity),
    }));

    if (cartItems.length == 0) {
      throw new AppError('Giỏ hàng rỗng', StatusCodes.BAD_REQUEST);
    }

    const productIds = cartItems.map((i) => i.productId);

    const products = await this.productRepo.findProductsForCheckout(productIds);

    if (products.length !== cartItems.length) {
      throw new AppError(MESSAGE.ORDER.INVALID_PRODUCTS, StatusCodes.BAD_REQUEST);
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    let totalAmount: number = 0;

    const orderItems = cartItems.map((item) => {
      const product = productMap.get(item.productId)!;

      if (item.quantity > product.stock) {
        throw new AppError(MESSAGE.ORDER.INSUFFICIENT_STOCK, StatusCodes.BAD_REQUEST);
      }

      const price = Number(product.price);

      totalAmount += price * item.quantity;

      return {
        product,
        quantity: item.quantity,
        price,
      };
    });

    // Group sản phẩm theo nhóm
    const shopMap = new Map<string, typeof orderItems>();

    for (const item of orderItems) {
      const shopId = item.product.shopId;
      if (!shopMap.has(shopId)) {
        shopMap.set(shopId, []);
      }

      shopMap.get(shopId)!.push(item);
    }

    const result = await this.orderRepo.createCheckoutTransaction(
      userId,
      totalAmount,
      data,
      shopMap,
    );

    // Invalidate cache
    const productSlugs = products.map((p) => p.slug);
    await this.productCacheRepo.invalidateCachesAfterCheckout(productSlugs);

    if (data.paymentMethod === PaymentMethod.COD) {
      // COD -> xóa cart và gửi mail ngay
      await this.cartRepo.clear(userId);

      await mailJob.sendOrderConfirmation({
        to: user.email,
        customerName: user.fullName,
        orderId: result.id,
        totalAmount,
      });

      return { result, paymentUrl: null };
    }

    if (data.paymentMethod === PaymentMethod.VNPAY) {
      // VNPAY -> tạo payment URL (gọi payment service)
      const paymentUrl = await paymentService.createPayment({
        orderGroupId: result.id,
        provider: PaymentMethod.VNPAY,
        ipAddr,
      });

      return { result, paymentUrl };
    }
  }

  // Xem danh sách toàn bộ đơn hàng
  async getMyOrders(userId: string, queryInput: any) {
    const { orders, total, meta } = await this.orderRepo.findOrderList(userId, queryInput);

    if (!meta || meta.type !== 'offset') {
      throw new AppError(MESSAGE.COMMON.INVALID_PAGINATION, StatusCodes.BAD_REQUEST);
    }

    return {
      orders,
      meta: buildOffsetMeta({
        totalItems: total,
        page: meta.page,
        limit: meta.limit,
      }),
    };
  }

  // Xem chi tiết từng đơn hàng
  async getOrderDetail(userId: string, orderId: string) {
    const order = await this.orderRepo.findOrderDetail(userId, orderId);

    if (!order) {
      throw new AppError(MESSAGE.ORDER.NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    return order;
  }

  /**
   * Cập nhật trạng thái đơn hàng
   */
  async updateOrderStatus(
    shopId: string,
    orderId: string,
    nextStatus: OrderStatus, // Trạng thái đơn hàng mà Seller muốn cập nhật
  ) {
    const order = await this.orderRepo.findOrderWithDetails(orderId);

    if (!order) {
      throw new AppError(MESSAGE.ORDER.NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    // Kiểm tra quyền seller
    if (order.shopId !== shopId) {
      throw new AppError(MESSAGE.ORDER.FORBIDDEN_UPDATE_STATUS, StatusCodes.FORBIDDEN);
    }

    // State machine: PENDING -> CONFIRMED -> SHIPPING -> DELIVERED -> CANCELLED
    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      CONFIRMED: [OrderStatus.SHIPPING, OrderStatus.CANCELLED],
      SHIPPING: [OrderStatus.DELIVERED],
      DELIVERED: [],
      CANCELLED: [],
    };

    if (!allowedTransitions[order.status].includes(nextStatus)) {
      throw new AppError(
        `Thay đổi trạng thái không hợp lệ ${order.status} -> ${nextStatus}`,
        StatusCodes.BAD_REQUEST,
      );
    }

    return await this.orderRepo.updateStatusTransaction(orderId, order, nextStatus);
  }

  async getShopOrders(shopId: string, queryInput: any) {
    const { orders, total, meta } = await this.orderRepo.findShopOrders(shopId, queryInput);

    if (!meta || meta.type !== 'offset') {
      throw new AppError(MESSAGE.COMMON.INVALID_PAGINATION, StatusCodes.BAD_REQUEST);
    }

    return {
      data: orders,
      meta: buildOffsetMeta({
        totalItems: total,
        page: meta.page,
        limit: meta.limit,
      }),
    };
  }

  async getShopAnalytics(shopId: string) {
    const cacheKey = CACHE_KEYS.SHOP.ANALYTICS(shopId);

    return cacheService.getOrSet(
      cacheKey,
      async () => this.orderRepo.getShopAnalyticsStats(shopId),
      CACHE_TTL.TINY,
    );
  }
}
