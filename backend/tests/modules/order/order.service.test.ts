import { mailJob } from '@/jobs/mail/mail.job';
import { OrderService } from '@/modules/order/order.service';
import { paymentService } from '@/modules/payment/payment.service';
import { MESSAGE } from '@/shared/constants/message.constants';
import { AppError } from '@/shared/utils/AppError';
import { OrderStatus, PaymentMethod } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';

jest.mock('@/jobs/mail/mail.job', () => ({
  mailJob: { sendOrderConfirmation: jest.fn() },
}));

jest.mock('@/modules/payment/payment.service', () => ({
  paymentService: { createPayment: jest.fn() },
}));

describe('OrderService', () => {
  let mockCartRepo: any;
  let mockProductRepo: any;
  let mockOrderRepo: any;
  let mockUserRepo: any;
  let mockProductCacheRepo: any;
  let orderService: OrderService;

  // Trước các test case thì sẽ chạy
  beforeEach(() => {
    // Mock các Repositories
    mockCartRepo = {
      getAll: jest.fn(),
      clear: jest.fn(),
    };

    mockProductRepo = {
      findProductsForCheckout: jest.fn(),
    };

    mockOrderRepo = {
      createCheckoutTransaction: jest.fn(),
      findOrderList: jest.fn(),
      findOrderDetail: jest.fn(),
      findOrderWithDetails: jest.fn(),
      updateStatusTransaction: jest.fn(),
    };

    mockUserRepo = {
      getProfileById: jest.fn(),
    };

    mockProductCacheRepo = {
      invalidateCachesAfterCheckout: jest.fn(),
    };

    // Khởi tạo Service với các Mock Repositories
    orderService = new OrderService(
      mockCartRepo,
      mockProductRepo,
      mockOrderRepo,
      mockUserRepo,
      mockProductCacheRepo,
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
      const mockResult = { id: 'order-group-1' };
      mockUserRepo.getProfileById.mockResolvedValue(user);
      mockCartRepo.getAll.mockResolvedValue({ 'prod-1': '2' });
      mockProductRepo.findProductsForCheckout.mockResolvedValue([
        { id: 'prod-1', price: 100, stock: 10, shopId: 'shop-1', slug: 'prod-1-slug' },
      ]);
      mockOrderRepo.createCheckoutTransaction.mockResolvedValue(mockResult);

      const result = await orderService.checkout(userId, ipAddr, checkoutData);

      expect(mockOrderRepo.createCheckoutTransaction).toHaveBeenCalled();
      expect(mockProductCacheRepo.invalidateCachesAfterCheckout).toHaveBeenCalledWith([
        'prod-1-slug',
      ]);
      expect(mockCartRepo.clear).toHaveBeenCalledWith(userId);
      expect(mailJob.sendOrderConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: 'order-group-1', totalAmount: 200 }),
      );
      expect(result).toEqual({ result: mockResult, paymentUrl: null });
    });

    it('should checkout successfully with VNPAY payment', async () => {
      const paymentUrl = 'http://vnpay.url';
      const vnpayData = { ...checkoutData, paymentMethod: PaymentMethod.VNPAY };
      
      mockUserRepo.getProfileById.mockResolvedValue(user);
      mockCartRepo.getAll.mockResolvedValue({ 'prod-1': '1' });
      mockProductRepo.findProductsForCheckout.mockResolvedValue([
        { id: 'prod-1', price: 100, stock: 10, shopId: 'shop-1', slug: 'prod-1' },
      ]);
      mockOrderRepo.createCheckoutTransaction.mockResolvedValue({ id: 'order-group-2' });
      (paymentService.createPayment as jest.Mock).mockResolvedValue(paymentUrl);

      const result = await orderService.checkout(userId, ipAddr, vnpayData);

      expect(paymentService.createPayment).toHaveBeenCalled();
      expect(mockCartRepo.clear).not.toHaveBeenCalled(); // VNPAY chưa thanh toán thì chưa xóa giỏ
      expect(result).toEqual({ result: { id: 'order-group-2' }, paymentUrl });
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
    const sellerId = 'seller-1';
    const orderId = 'order-1';

    it('should throw error if order not found', async () => {
      mockOrderRepo.findOrderWithDetails.mockResolvedValue(null);

      const promise = orderService.updateOrderStatus(orderId, OrderStatus.CONFIRMED, sellerId);

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.NOT_FOUND,
        message: MESSAGE.ORDER.NOT_FOUND,
      });
    });

    it('should throw error if seller is forbidden', async () => {
      mockOrderRepo.findOrderWithDetails.mockResolvedValue({
        id: orderId,
        shop: { ownerId: 'other-seller' },
      });

      const promise = orderService.updateOrderStatus(orderId, OrderStatus.CONFIRMED, sellerId);

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.FORBIDDEN,
        message: MESSAGE.ORDER.FORBIDDEN_UPDATE_STATUS,
      });
    });

    it('should throw error if status transition is invalid', async () => {
      mockOrderRepo.findOrderWithDetails.mockResolvedValue({
        id: orderId,
        status: OrderStatus.PENDING, // Đã giao xong thì không được chuyển trạng thái nữa
        shop: { ownerId: sellerId },
      });

      const spy = jest.spyOn(mockOrderRepo, 'updateStatusTransaction');

      const promise = orderService.updateOrderStatus(orderId, OrderStatus.SHIPPING, sellerId);

      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toMatchObject({
        statusCode: StatusCodes.BAD_REQUEST,
      });
      expect(spy).not.toHaveBeenCalled();
    });

    it('should call updateStatusTransaction successfully', async () => {
      const mockOrder = {
        id: orderId,
        status: OrderStatus.PENDING,
        shop: { ownerId: sellerId },
      };
      mockOrderRepo.findOrderWithDetails.mockResolvedValue(mockOrder);
      mockOrderRepo.updateStatusTransaction.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CONFIRMED,
      });

      await orderService.updateOrderStatus(orderId, OrderStatus.CONFIRMED, sellerId);

      expect(mockOrderRepo.updateStatusTransaction).toHaveBeenCalledWith(
        orderId,
        mockOrder,
        OrderStatus.CONFIRMED,
      );
    });
  });
});
