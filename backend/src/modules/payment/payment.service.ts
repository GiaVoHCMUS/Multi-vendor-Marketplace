import { prisma } from '@/core/config/prisma';
import { CreatePaymentInput } from './payment.type';
import { VNPayProvider } from './providers/vnpay.provider';
import { AppError } from '@/shared/utils/AppError';
import { MESSAGE } from '@/shared/constants/message.constants';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  TransactionType,
} from '@prisma/client';

export class PaymentService {
  private vnpay = new VNPayProvider();

  // create payment
  async createPayment(input: CreatePaymentInput) {
    const orderGroup = await prisma.orderGroup.findUnique({
      where: { id: input.orderGroupId },
      include: { orders: true },
    });

    if (!orderGroup) throw new AppError(MESSAGE.ORDER.NOT_FOUND, 404);

    if (orderGroup.paymentStatus !== PaymentStatus.PENDING) {
      throw new AppError(MESSAGE.ORDER.ALREADY_PAID_OR_INVALID, 400);
    }

    if (input.provider === PaymentMethod.VNPAY) {
      const paymentUrl = this.vnpay.createPaymentUrl({
        orderId: orderGroup.id,
        amount: Number(orderGroup.totalAmount),
        ipAddr: input.ipAddr,
      });

      return { paymentUrl };
    }

    // COD
    return { message: 'Người dùng thanh toán khi nhận hàng' };
  }

  async handleVNPayIPN(query: Record<string, string>) {
    const isValid = this.vnpay.verifyReturn(query);

    if (!isValid) {
      return { RspCode: '97', Message: 'Invalid signature' };
    }

    const orderGroupId = query['vnp_TxnRef'];
    const responseCode = query['vnp_ResponseCode'];
    const transactionStatus = query['vnp_TransactionStatus'];

    const success = responseCode === '00' && transactionStatus === '00';

    const orderGroup = await prisma.orderGroup.findUnique({
      where: { id: orderGroupId },
      include: { orders: true },
    });

    if (!orderGroup) {
      return { RspCode: '01', Message: 'Order not found' };
    }

    if (orderGroup.paymentStatus === PaymentStatus.COMPLETED) {
      return { RspCode: '00', Message: 'Already confirmed' };
    }

    const amount = Number(query['vnp_Amount']) / 100;
    if (amount !== Number(orderGroup.totalAmount)) {
      return { RspCode: '04', Message: 'Invalid amount' };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update OrderGroup
      await tx.orderGroup.update({
        where: { id: orderGroupId },
        data: {
          paymentStatus: success
            ? PaymentStatus.COMPLETED
            : PaymentStatus.FAILED,
        },
      });

      // 2. Update tất cả Order con
      await tx.order.updateMany({
        where: { orderGroupId },
        data: {
          status: success ? OrderStatus.PAID : OrderStatus.CANCELLED,
        },
      });

      // 3. Tạo Transaction log
      await tx.transaction.create({
        data: {
          orderGroupId,
          amount: orderGroup.totalAmount,
          type: TransactionType.PAYMENT,
          status: success ? PaymentStatus.COMPLETED : PaymentStatus.FAILED,
        },
      });
    });

    return { RspCode: '00', Message: 'Confirm Success' };
  }

  async handleVNPayReturn(query: Record<string, string>) {
    const isValid = this.vnpay.verifyReturn(query);

    if (!isValid) {
      return { success: false };
    }

    const responseCode = query['vnp_ResponseCode'];

    return {
      success: responseCode === '00',
    };
  }
}
