import { mailJob } from '@/jobs/mail/mail.job';
import { OrderService } from '@/modules/order/order.service';
import { paymentService } from '@/modules/payment/payment.service';
import { MESSAGE } from '@/shared/constants/message.constants';
import { AppError } from '@/shared/utils/AppError';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PayoutStatus,
} from '@prisma/client';
import { StatusCodes } from 'http-status-codes';

jest.mock('@/jobs/mail/mail.job', () => ({
  mailJob: { sendOrderConfirmation: jest.fn() },
}));

jest.mock('@/modules/payment/payment.service', () => ({
  paymentService: { createPayment: jest.fn() },
}));

jest.mock('@/shared/services/cache.service', () => ({
  cacheService: {
    getOrSet: jest.fn((key, cb) => cb()), // Ép chạy callback để vào repository
    getTracker: jest.fn(),
    invalidateTracker: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('OrderService', () => {
  let mockCartRepo: any;
  let mockProductRepo: any;
  let mockOrderRepo: any;
  let mockUserRepo: any;
  let mockProductCacheRepo: any;
  let mockTxManager: any;
  let mockOrderGroupRepo: any;
  let mockOrderItemRepo: any;
  let mockShopRepo: any;
  let mockTransactionRepo: any;

  let orderService: OrderService;

  // Trước các test case thì sẽ chạy
  beforeEach(() => {
    // Mock các Repositories
    mockCartRepo = { getAll: jest.fn(), clear: jest.fn() };

    mockProductRepo = {
      findProductsForCheckout: jest.fn(),
      useTransaction: jest.fn().mockReturnThis(),
      decrementStock: jest.fn(),
      incrementStock: jest.fn(),
    };

    mockOrderRepo = {
      useTransaction: jest.fn().mockReturnThis(),
      findOrderList: jest.fn(),
      findOrderDetail: jest.fn(),
      findOrderWithDetails: jest.fn(),
      updateStatus: jest.fn(),
      updatePayoutStatus: jest.fn(),
      findStatusesByGroupId: jest.fn(),
      findShopOrders: jest.fn(),
      getShopAnalyticsStats: jest.fn(),
      createOrder: jest.fn(),
    };

    mockUserRepo = { getProfileById: jest.fn() };

    mockProductCacheRepo = { invalidateCachesAfterCheckout: jest.fn() };

    mockTxManager = {
      run: jest.fn().mockImplementation(async (fn) => await fn('fake-tx-client')),
    };

    mockOrderGroupRepo = {
      useTransaction: jest.fn().mockReturnThis(),
      createOrderGroup: jest.fn(),
      updatePaymentStatus: jest.fn(),
    };
    mockOrderItemRepo = { useTransaction: jest.fn().mockReturnThis(), createOrderItem: jest.fn() };
    mockShopRepo = { useTransaction: jest.fn().mockReturnThis(), incrementBalance: jest.fn() };
    mockTransactionRepo = {
      useTransaction: jest.fn().mockReturnThis(),
      createTransaction: jest.fn(),
    };

    // Khởi tạo Service với các Mock Repositories
    orderService = new OrderService(
      mockCartRepo,
      mockProductRepo,
      mockOrderRepo,
      mockUserRepo,
      mockProductCacheRepo,
      mockTxManager,
      mockOrderGroupRepo,
      mockOrderItemRepo,
      mockShopRepo,
      mockTransactionRepo,
    );
  });

  describe('checkout()', () => {
    const userId = 'user-1';
    const ipAddr = '127.0.0.1';
    const checkoutData = {
      paymentMethod: PaymentMethod.COD,
      shippingName: 'Test',
      shippingPhone: '0123456789',
      shippingAddress: 'HCM',
    };
    const user = { id: userId, email: 'test@gmail.com', fullName: 'Tester' };
    const mockProducts = [
      { id: 'prod-1', price: 100, stock: 10, shopId: 'shop-1', slug: 'prod-1-slug' },
    ];
    const mockCart = { 'prod-1': '2' };

    it('should throw error if user not found', async () => {
      mockUserRepo.getProfileById.mockResolvedValue(null);

      const promise = orderService.checkout(userId, ipAddr, checkoutData);

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.NOT_FOUND,
        message: MESSAGE.USER.NOT_FOUND,
      });
    });

    it('should throw error if cart is empty', async () => {
      mockUserRepo.getProfileById.mockResolvedValue(user);
      mockCartRepo.getAll.mockResolvedValue({}); // Giỏ hàng rỗng

      const promise = orderService.checkout(userId, ipAddr, checkoutData);

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.BAD_REQUEST,
        message: 'Giỏ hàng rỗng',
      });
    });

    it('should throw error if products in cart are invalid/deleted', async () => {
      mockUserRepo.getProfileById.mockResolvedValue(user);
      mockCartRepo.getAll.mockResolvedValue({ 'prod-1': '2' }); // Có 1 SP trong giỏ
      mockProductRepo.findProductsForCheckout.mockResolvedValue([]); // Nhưng DB không tìm thấy SP nào

      const promise = orderService.checkout(userId, ipAddr, checkoutData);

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.BAD_REQUEST,
        message: MESSAGE.ORDER.INVALID_PRODUCTS,
      });
    });

    it('should throw error if insufficient stock', async () => {
      mockUserRepo.getProfileById.mockResolvedValue(user);
      mockCartRepo.getAll.mockResolvedValue({ 'prod-1': '5' }); // Mua 5
      mockProductRepo.findProductsForCheckout.mockResolvedValue([
        { id: 'prod-1', price: 100, stock: 2, shopId: 'shop-1' }, // Kho chỉ có 2
      ]);

      const promise = orderService.checkout(userId, ipAddr, checkoutData);

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.BAD_REQUEST,
        message: MESSAGE.ORDER.INSUFFICIENT_STOCK,
      });
    });

    it('should checkout successfully with COD payment', async () => {
      mockUserRepo.getProfileById.mockResolvedValue(user);
      mockCartRepo.getAll.mockResolvedValue(mockCart);
      mockProductRepo.findProductsForCheckout.mockResolvedValue(mockProducts);

      const mockOrderGroup = { id: 'group-1' };
      const mockOrder = { id: 'order-1' };

      mockOrderGroupRepo.createOrderGroup.mockResolvedValue(mockOrderGroup);
      mockOrderRepo.createOrder.mockResolvedValue(mockOrder);

      const result = await orderService.checkout(userId, ipAddr, checkoutData);

      // 3. Assertions (Kiểm tra logic điều phối Transaction)
      expect(mockTxManager.run).toHaveBeenCalled();

      // Kiểm tra xem các repo có được switch sang mode transaction không
      expect(mockOrderGroupRepo.useTransaction).toHaveBeenCalledWith('fake-tx-client');
      expect(mockOrderRepo.useTransaction).toHaveBeenCalledWith('fake-tx-client');
      expect(mockOrderItemRepo.useTransaction).toHaveBeenCalledWith('fake-tx-client');
      expect(mockProductRepo.useTransaction).toHaveBeenCalledWith('fake-tx-client');

      // Kiểm tra việc tạo OrderGroup
      expect(mockOrderGroupRepo.createOrderGroup).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          totalAmount: 200, // 100 * 2
          paymentStatus: PaymentStatus.PENDING,
        }),
      );

      // Kiểm tra việc tạo Order lẻ cho Shop
      expect(mockOrderRepo.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          orderGroupId: 'group-1',
          shopId: 'shop-1',
          totalAmount: 200,
        }),
      );

      // Kiểm tra tạo OrderItem và trừ kho
      expect(mockOrderItemRepo.createOrderItem).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-1',
          productId: 'prod-1',
          quantity: 2,
        }),
      );
      expect(mockProductRepo.decrementStock).toHaveBeenCalledWith('prod-1', 2);

      // Kiểm tra hậu xử lý COD: Xóa giỏ, gửi mail, xóa cache
      expect(mockProductCacheRepo.invalidateCachesAfterCheckout).toHaveBeenCalledWith([
        'prod-1-slug',
      ]);
      expect(mockCartRepo.clear).toHaveBeenCalledWith(userId);
      expect(mailJob.sendOrderConfirmation).toHaveBeenCalled();

      expect(result).toEqual({ result: mockOrderGroup, paymentUrl: null });
    });

    it('should checkout successfully with VNPAY payment', async () => {
      // const mockProducts = [
      //   { id: 'prod-1', price: 100, stock: 10, shopId: 'shop-1', slug: 'prod-1-slug' },
      // ];
      // const mockCart = { 'prod-1': '2' };
      const vnpayData = { ...checkoutData, paymentMethod: PaymentMethod.VNPAY };

      mockUserRepo.getProfileById.mockResolvedValue(user);
      mockCartRepo.getAll.mockResolvedValue(mockCart);
      mockProductRepo.findProductsForCheckout.mockResolvedValue(mockProducts);

      const mockOrderGroup = { id: 'group-2' };
      const mockOrder = { id: 'order-1' };
      mockOrderGroupRepo.createOrderGroup.mockResolvedValue(mockOrderGroup);
      mockOrderRepo.createOrder.mockResolvedValue(mockOrder);

      const fakePaymentUrl = 'http://vnpay.com/pay';
      (paymentService.createPayment as jest.Mock).mockResolvedValue(fakePaymentUrl);

      const result = await orderService.checkout(userId, ipAddr, vnpayData);

      expect(paymentService.createPayment).toHaveBeenCalledWith({
        orderGroupId: 'group-2',
        provider: PaymentMethod.VNPAY,
        ipAddr,
      });

      // Đối với thanh toán online, chưa xóa giỏ hàng cho đến khi có Webhook callback thành công
      expect(mockCartRepo.clear).not.toHaveBeenCalled();

      expect(result).toEqual({ result: mockOrderGroup, paymentUrl: fakePaymentUrl });
    });
  });

  describe('getMyOrders', () => {
    it('should throw error if meta type is not offset', async () => {
      mockOrderRepo.findOrderList.mockResolvedValue({
        orders: [],
        total: 0,
        meta: { type: 'cursor' },
      });

      const promise = orderService.getMyOrders('user-1', {});

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.BAD_REQUEST,
      });
    });

    it('should return orders with correct meta', async () => {
      mockOrderRepo.findOrderList.mockResolvedValue({
        orders: [{ id: 'order-1' }],
        total: 1,
        meta: { type: 'offset', page: 1, limit: 10 },
      });

      const result = await orderService.getMyOrders('user-1', {});

      expect(result.orders).toHaveLength(1);
      expect(result.meta.limit).toBe(10);
    });
  });

  describe('getOrderDetail()', () => {
    it('should throw error if order is not found', async () => {
      mockOrderRepo.findOrderDetail.mockResolvedValue(null);
      const promise = orderService.getOrderDetail('user-1', 'oder-1');

      expect(promise).rejects.toThrow(AppError);
      expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.NOT_FOUND,
        message: MESSAGE.ORDER.NOT_FOUND,
      });
    });

    it('should return detail order successfully', async () => {
      mockOrderRepo.findOrderDetail.mockResolvedValue({
        id: 'order-1',
        orderGroupId: 'order-group-1',
        status: OrderStatus.PENDING,
        totalAmount: 5000000,
      });

      const result = await orderService.getOrderDetail('user-1', 'order-1');

      expect(result.status).toBe(OrderStatus.PENDING);
      expect(result.totalAmount).toBe(5000000);
      expect(result.id).toBe('order-1');
    });
  });

  describe('updateOrderStatus()', () => {
    const shopId = 'shop-1';
    const orderId = 'order-1';

    it('should throw error if order not found', async () => {
      mockOrderRepo.findOrderWithDetails.mockResolvedValue(null);

      const promise = orderService.updateOrderStatus(shopId, orderId, OrderStatus.CONFIRMED);

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.NOT_FOUND,
        message: MESSAGE.ORDER.NOT_FOUND,
      });
    });

    it('should throw error if seller is forbidden', async () => {
      mockOrderRepo.findOrderWithDetails.mockResolvedValue({
        id: orderId,
        shop: { ownerId: 'other-shop-id' },
      });

      const promise = orderService.updateOrderStatus(shopId, orderId, OrderStatus.CONFIRMED);

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.FORBIDDEN,
        message: MESSAGE.ORDER.FORBIDDEN_UPDATE_STATUS,
      });
    });

    it('should throw error if status transition is invalid', async () => {
      mockOrderRepo.findOrderWithDetails.mockResolvedValue({
        id: orderId,
        status: OrderStatus.PENDING,
        shopId,
      });

      const promise = orderService.updateOrderStatus(shopId, orderId, OrderStatus.SHIPPING);

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.BAD_REQUEST,
      });
      expect(mockTxManager.run).not.toHaveBeenCalled();
    });

    it('should update status successfully for basic transition (PENDING -> CONFIRMED)', async () => {
      const mockOrder = {
        id: orderId,
        status: OrderStatus.PENDING,
        shopId,
      };
      mockOrderRepo.findOrderWithDetails.mockResolvedValue(mockOrder);
      mockOrderRepo.updateStatus.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CONFIRMED,
      });

      const result = await orderService.updateOrderStatus(shopId, orderId, OrderStatus.CONFIRMED);

      expect(mockTxManager.run).toHaveBeenCalled();
      expect(mockOrderRepo.useTransaction).toHaveBeenCalledWith('fake-tx-client');
      expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith(orderId, OrderStatus.CONFIRMED);
      expect(result.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should rollback stock and create refund transaction when CANCELLED', async () => {
      const mockOrder = {
        id: orderId,
        status: OrderStatus.PENDING,
        shopId,
        orderItems: [
          { productId: 'product-01', quantity: 1 },
          { productId: 'product-02', quantity: 2 },
        ],
      };
      mockOrderRepo.findOrderWithDetails.mockResolvedValue(mockOrder);
      mockOrderRepo.updateStatus.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CANCELLED,
      });

      const result = await orderService.updateOrderStatus(shopId, orderId, OrderStatus.CANCELLED);

      expect(mockTxManager.run).toHaveBeenCalled();
      expect(mockOrderRepo.useTransaction).toHaveBeenCalledWith('fake-tx-client');
      expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith(orderId, OrderStatus.CANCELLED);
      expect(mockProductRepo.useTransaction).toHaveBeenCalledWith('fake-tx-client');
      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('should throw error if checkAndCompleteOrderGroup finds no orders', async () => {
      const mockOrder = {
        id: orderId,
        status: OrderStatus.SHIPPING,
        shopId,
        orderItems: [
          { productId: 'product-01', quantity: 1 },
          { productId: 'product-02', quantity: 2 },
        ],
        orderGroup: {
          paymentMethod: PaymentMethod.COD,
        },
        totalAmount: 500000,
      };
      mockOrderRepo.findOrderWithDetails.mockResolvedValue(mockOrder);
      mockOrderRepo.updateStatus.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.DELIVERED,
      });
      // Giả lập database trả về mảng rỗng (lỗi dữ liệu mồ côi)
      mockOrderRepo.findStatusesByGroupId.mockResolvedValue([]);

      const promise = orderService.updateOrderStatus(shopId, orderId, OrderStatus.DELIVERED);

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.NOT_FOUND,
      });
      expect(mockOrderGroupRepo.updatePaymentStatus).not.toHaveBeenCalled();
    });

    it('should handle payout and complete group when DELIVERED with COD', async () => {
      const mockOrder = {
        id: orderId,
        status: OrderStatus.SHIPPING,
        shopId,
        orderItems: [
          { productId: 'product-01', quantity: 1 },
          { productId: 'product-02', quantity: 2 },
        ],
        orderGroup: {
          paymentMethod: PaymentMethod.COD,
        },
        totalAmount: 500000,
      };
      mockOrderRepo.findOrderWithDetails.mockResolvedValue(mockOrder);
      mockOrderRepo.updateStatus.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.DELIVERED,
      });
      mockOrderRepo.findStatusesByGroupId.mockResolvedValue([{ status: OrderStatus.DELIVERED }]);

      await orderService.updateOrderStatus(shopId, orderId, OrderStatus.DELIVERED);

      expect(mockTxManager.run).toHaveBeenCalled();
      expect(mockOrderRepo.useTransaction).toHaveBeenCalledWith('fake-tx-client');
      expect(mockOrderRepo.updatePayoutStatus).toHaveBeenCalledWith(orderId, PayoutStatus.PAID_OUT);
      expect(mockShopRepo.incrementBalance).toHaveBeenCalledWith(
        mockOrder.shopId,
        Number(mockOrder.totalAmount),
      );
    });
  });

  describe('getShopOrder()', () => {
    const shopId = 'shop-1';

    it('should throw error if meta type is not offset', async () => {
      mockOrderRepo.findShopOrders.mockResolvedValue({
        orders: [],
        total: 0,
        meta: { type: 'cursor' }, // Sai kiểu phân trang
      });

      const promise = orderService.getShopOrders(shopId, {});

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.BAD_REQUEST,
      });
    });

    it('should return shop orders with correct meta', async () => {
      mockOrderRepo.findShopOrders.mockResolvedValue({
        orders: [{ id: 'order-1', shopId }],
        total: 5,
        meta: { type: 'offset', page: 1, limit: 10 },
      });

      const result = await orderService.getShopOrders(shopId, {});

      expect(result.data).toHaveLength(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalItems).toBe(5);
      expect(mockOrderRepo.findShopOrders).toHaveBeenCalledWith(shopId, {});
    });
  });

  describe('getShopAnalytics()', () => {
    it('should call getOrSet cache and return analytics data', async () => {
      const shopId = 'shop-1';
      const mockStats = {
        totalOrders: 20,
        deliveredOrders: 15,
        revenue: 5000000,
      };

      mockOrderRepo.getShopAnalyticsStats.mockResolvedValue(mockStats);

      const result = await orderService.getShopAnalytics(shopId);

      expect(mockOrderRepo.getShopAnalyticsStats).toHaveBeenCalledWith(shopId);

      expect(result).toEqual(mockStats);
    });
  });
});
