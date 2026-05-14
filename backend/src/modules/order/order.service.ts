import { CheckoutInput, GetMyOrdersQuery } from './order.type';
import { AppError } from '@/shared/utils/AppError';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PayoutStatus,
  TransactionType,
} from '@prisma/client';
import { MESSAGE } from '@/shared/constants/message.constants';
import { buildOffsetMeta } from '@/shared/utils/buildMeta';
import { mailJob } from '@/jobs/mail/mail.job';
import { paymentService } from '../payment/payment.service';
import { StatusCodes } from 'http-status-codes';
import { OrderRepository } from './repositories/order.repository';
import { RedisCartRepository } from '../cart/repositories/redis-cart.cache';
import { ProductRepository } from '../products/repositories/product.repository';
import { UserRepository } from '../user/user.repository';
import { ProductCacheRepository } from '../products/repositories/product.cache';
import { cacheService } from '@/shared/services/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '@/shared/constants/cache.constants';
import { TransactionManager } from '@/core/database/transaction-manager';
import { OrderGroupRepository } from './repositories/order-group.repository';
import { OrderItemRepository } from './repositories/order-item.repository';
import { ShopRepository } from '../shop/shop.repository';
import { TransactionRepository } from '../payment/repositories/transaction.repository';
import { TransactionClient } from '@/core/database/db-type';
import { GetShopOrdersQuery } from '../shop/shop.type';

export class OrderService {
  constructor(
    private readonly cartRepo: RedisCartRepository,
    private readonly productRepo: ProductRepository,
    private readonly orderRepo: OrderRepository,
    private readonly userRepo: UserRepository,
    private readonly productCacheRepo: ProductCacheRepository,
    private readonly txManager: TransactionManager,
    private readonly orderGroupRepo: OrderGroupRepository,
    private readonly orderItemRepo: OrderItemRepository,
    private readonly shopRepo: ShopRepository,
    private readonly transactionRepo: TransactionRepository,
  ) {}

  checkout = async (userId: string, ipAddr: string, data: CheckoutInput) => {
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

    const result = await this.txManager.run(async (tx) => {
      // Chuyển tất cả Repo sang mode Transaction
      const groupRepoTx = this.orderGroupRepo.useTransaction(tx);
      const orderRepoTx = this.orderRepo.useTransaction(tx);
      const itemRepoTx = this.orderItemRepo.useTransaction(tx);
      const productRepoTx = this.productRepo.useTransaction(tx);

      // 1. Lưu OrderGroup vào database
      const orderGroup = await groupRepoTx.createOrderGroup({
        userId,
        totalAmount,
        ...data,
        paymentStatus: PaymentStatus.PENDING,
      });

      // 2. Chia các orderGroup đó thành các Order nhỏ hơn (theo Shop)
      // Tạo Order theo từng shop và lưu OrderItem cho cho Order này, cũng như trừ số lượng Products của seller
      for (const [shopId, items] of shopMap) {
        const shopTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

        const order = await orderRepoTx.createOrder({
          orderGroupId: orderGroup.id,
          shopId,
          totalAmount: shopTotal,
          status: OrderStatus.PENDING,
        });

        for (const item of items) {
          await itemRepoTx.createOrderItem({
            orderId: order.id,
            productId: item.product.id,
            quantity: item.quantity,
            priceAtPurchase: item.price,
          });

          await productRepoTx.decrementStock(item.product.id, item.quantity);
        }
      }

      return orderGroup;
    });

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
  };

  // Xem danh sách toàn bộ đơn hàng
  getMyOrders = async (userId: string, queryInput: GetMyOrdersQuery) => {
    const { orders, total, meta } = await this.orderRepo.findOrderList(userId, queryInput);

    if (!meta || meta.type !== 'offset') {
      throw new AppError(MESSAGE.COMMON.INVALID_PAGINATION, StatusCodes.BAD_REQUEST);
    }

    const formattedOrders = orders.map((order) => ({
      ...order,
      orderItems: order.orderItems.map((item) => ({
        id: item.id,
        productId: item.product.id,
        productSlug: item.product.slug,
        productName: item.product.name,
        productImage: item.product.images?.[0].url,
        productQuantity: item.quantity,
        productPriceAtPurchase: item.priceAtPurchase,
      })),
    }));

    return {
      formattedOrders,
      meta: buildOffsetMeta({
        totalItems: total,
        page: meta.page,
        limit: meta.limit,
      }),
    };
  };

  // Xem chi tiết từng đơn hàng
  getOrderDetail = async (userId: string, orderId: string) => {
    const order = await this.orderRepo.findForUserDetail(userId, orderId);

    if (!order) {
      throw new AppError(MESSAGE.ORDER.NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    const formattedOrder = {
      ...order,
      orderItems: order.orderItems.map((item) => ({
        id: item.id,
        productId: item.product.id,
        productSlug: item.product.slug,
        productName: item.product.name,
        productImage: item.product.images?.[0]?.url || null,
        productQuantity: item.quantity,
        productPriceAtPurchase: item.priceAtPurchase,
      })),
    };

    return formattedOrder;
  };

  /**
   * Logic kiểm tra và hoàn tất OrderGroup -> nghiệp vụ nội bộ của Service
   */
  private checkAndCompleteOrderGroup = async (tx: TransactionClient, orderGroupId: string) => {
    const orderRepoTx = this.orderRepo.useTransaction(tx);
    const orderGroupRepoTx = this.orderGroupRepo.useTransaction(tx);

    // 1. Lấy trạng thái của tất cả đơn hàng con qua Repo
    const orders = await orderRepoTx.findStatusesByGroupId(orderGroupId);

    if (!orders || orders.length === 0) {
      throw new AppError('Không tìm thấy đơn hàng nào trong orderGroup này', StatusCodes.NOT_FOUND);
    }

    // 2. Kiểm tra tất cả đã được DELIVERED chưa
    const allDelivered = orders.every((order) => order.status === OrderStatus.DELIVERED);

    // 3. Nếu cthoar mãn, cập nhật trạng thái OrderGroup
    if (allDelivered) {
      await orderGroupRepoTx.updatePaymentStatus(orderGroupId, PaymentStatus.COMPLETED);
    }
  };

  /**
   * Cập nhật trạng thái đơn hàng
   */
  updateOrderStatus = async (
    shopId: string,
    orderId: string,
    nextStatus: OrderStatus, // Trạng thái đơn hàng mà Seller muốn cập nhật
  ) => {
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

    // return await this.orderRepo.updateStatusTransaction(orderId, order, nextStatus);
    return await this.txManager.run(async (tx) => {
      const orderRepoTx = this.orderRepo.useTransaction(tx);
      const productRepoTx = this.productRepo.useTransaction(tx);
      const shopRepoTx = this.shopRepo.useTransaction(tx);
      const transactionRepoTx = this.transactionRepo.useTransaction(tx);

      // 1, Cập nhật trạng thái mới cho đơn hàng
      const updatedOrder = await orderRepoTx.updateStatus(orderId, nextStatus);

      // 2. Nếu Seller cập nhật đơn hàng là bị hủy
      if (nextStatus === OrderStatus.CANCELLED) {
        for (const item of order.orderItems) {
          await productRepoTx.incrementStock(item.productId, item.quantity);
        }

        await transactionRepoTx.createTransaction({
          type: TransactionType.REFUND,
          amount: 0,
          status: PaymentStatus.COMPLETED,
          shopId: order.shopId,
          orderId: order.id,
          orderGroupId: order.orderGroupId,
          description: 'Đơn hàng bị hủy, rollback stock',
        });
      }

      // 3. Logic xử lý khi đơn hàng giao hàng thành công và tiền mặt COD
      if (
        nextStatus === OrderStatus.DELIVERED &&
        order.orderGroup.paymentMethod === PaymentMethod.COD
      ) {
        // Đánh dấu là đã đối soát
        await orderRepoTx.updatePayoutStatus(orderId, PayoutStatus.PAID_OUT);

        // Cộng tiền vào số dư cho Shop
        await shopRepoTx.incrementBalance(order.shopId, Number(order.totalAmount));

        // Tạo Transaction ghi nhận tiền
        await transactionRepoTx.createTransaction({
          type: TransactionType.PAYMENT,
          amount: order.totalAmount,
          status: PaymentStatus.COMPLETED,
          shopId: order.shopId,
          orderId: order.id,
          orderGroupId: order.orderGroupId,
          description: 'Đơn hàng thanh toán khi nhận hàng đã được giao',
        });

        // Kiểm tra và cập nhật orderGroup
        await this.checkAndCompleteOrderGroup(tx, order.orderGroupId);
      }

      return updatedOrder;
    });
  };

  getShopOrders = async (shopId: string, queryInput: GetShopOrdersQuery) => {
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
  };

  getShopAnalytics = async (shopId: string) => {
    const cacheKey = CACHE_KEYS.SHOP.ANALYTICS(shopId);

    return cacheService.getOrSet(
      cacheKey,
      async () => this.orderRepo.getShopAnalyticsStats(shopId),
      CACHE_TTL.TINY,
    );
  };
}
