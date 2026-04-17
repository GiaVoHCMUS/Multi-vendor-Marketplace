import { prisma } from '@/core/config/prisma';
import { CreatePaymentInput } from './payment.type';
import { VNPayProvider } from './providers/vnpay.provider';
import { AppError } from '@/shared/utils/AppError';
import { MESSAGE } from '@/shared/constants/message.constants';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PayoutStatus,
  TransactionType,
} from '@prisma/client';
import { redisClient } from '@/core/cache/redis';
import { mailJob } from '@/jobs/mail/mail.job';
import { CACHE_KEYS } from '@/shared/constants/cache.constants';
import { StatusCodes } from 'http-status-codes';

const redis = redisClient.getInstance();

class PaymentService {
  private vnpay = new VNPayProvider();

  // create payment
  async createPayment(input: CreatePaymentInput) {
    const orderGroup = await prisma.orderGroup.findUnique({
      where: { id: input.orderGroupId },
      include: { orders: true },
    });

    if (!orderGroup) throw new AppError(MESSAGE.ORDER.NOT_FOUND, StatusCodes.NOT_FOUND);

    if (orderGroup.paymentStatus !== PaymentStatus.PENDING) {
      throw new AppError(MESSAGE.ORDER.ALREADY_PAID_OR_INVALID, StatusCodes.BAD_REQUEST);
    }

    if (input.provider === PaymentMethod.VNPAY) {
      const paymentUrl = this.vnpay.createPaymentUrl({
        orderId: orderGroup.id,
        amount: Number(orderGroup.totalAmount),
        ipAddr: input.ipAddr,
      });

      return paymentUrl;
    }

    // Có lỗi thì return là null
    return null;
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
      include: {
        orders: {
          include: {
            orderItems: {
              include: { product: { select: { slug: true } } },
            },
          },
        },
      },
    });

    if (!orderGroup) {
      return { RspCode: '01', Message: 'Order not found' };
    }

    if (orderGroup.paymentStatus !== PaymentStatus.PENDING) {
      return { RspCode: '02', Message: 'Order already confirmed' };
    }

    const amount = Number(query['vnp_Amount']) / 100;
    if (amount !== Number(orderGroup.totalAmount)) {
      return { RspCode: '04', Message: 'Invalid amount' };
    }

    // Lưu thông tin để gửi email
    let userEmailInfo: {
      to: string;
      customerName: string;
      orderId: string;
      totalAmount: number;
    } | null = null;
    // Dùng Pipeline để gom các lệnh Redis
    const pipeline = redis.multi();
    await prisma.$transaction(async (tx) => {
      if (success) {
        // Thanh toán thành công
        // 1. Update OrderGroup
        await tx.orderGroup.update({
          where: { id: orderGroupId },
          data: {
            paymentStatus: PaymentStatus.COMPLETED,
            paidAt: new Date(),
          },
        });

        // 2. Update tất cả Order con
        await tx.order.updateMany({
          where: { orderGroupId },
          data: {
            status: OrderStatus.CONFIRMED,
            payoutStatus: PayoutStatus.PAID_OUT,
            payoutAt: new Date(),
          },
        });

        const user = await tx.user.findUnique({
          where: { id: orderGroup.userId },
          select: { email: true, fullName: true },
        });

        if (user) {
          userEmailInfo = {
            to: user.email,
            customerName: user.fullName,
            orderId: orderGroupId,
            totalAmount: Number(orderGroup.totalAmount),
          };
        }
      } else {
        // Thanh toán thất bại
        await tx.orderGroup.update({
          where: { id: orderGroupId },
          data: { paymentStatus: PaymentStatus.FAILED },
        });

        for (const order of orderGroup.orders) {
          // Cập nhật trạng thái đơn con thành CANCELLED
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: OrderStatus.CANCELLED,
              payoutStatus: PayoutStatus.FAILED_PAYMENT,
            },
          });

          // Hoàn stock từng sản phẩm
          for (const item of order.orderItems) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } }, // Trả lại hàng vào kho
            });

            if (item.product.slug) {
              pipeline.del(CACHE_KEYS.PRODUCT.SLUG(item.product.slug));
            }
          }
        }

        // Invalidate cache và thực thi
        pipeline.incr(CACHE_KEYS.PRODUCT.TRACKER_LIST);

        // Gửi mail hủy đơn hàng nữa
        const user = await tx.user.findUnique({
          where: { id: orderGroup.userId },
          select: { email: true, fullName: true },
        });

        if (user) {
          userEmailInfo = {
            to: user.email,
            customerName: user.fullName,
            orderId: orderGroupId,
            totalAmount: Number(orderGroup.totalAmount),
          };
        }
      }

      // Tạo Transaction log transaction cho cả 2 trường hợp
      await tx.transaction.create({
        data: {
          orderGroupId,
          amount: orderGroup.totalAmount,
          type: TransactionType.PAYMENT,
          status: success ? PaymentStatus.COMPLETED : PaymentStatus.FAILED,
          description: success
            ? 'VNPAY: Thanh toán thành công'
            : 'VNPAY: Thanh toán thất bại hoặc bị hủy',
        },
      });
    });

    if (success) {
      await redis.del(`marketplace:cart:${orderGroup.userId}`);
      if (userEmailInfo) {
        await mailJob.sendOrderCheckoutSuccessfully(userEmailInfo);
      }
    } else {
      await pipeline.exec();
      if (userEmailInfo) {
        await mailJob.sendOrderCheckoutFailed(userEmailInfo);
      }
    }

    return { RspCode: '00', Message: 'Confirm Success' };
  }

  async handleVNPayReturn(query: Record<string, string>) {
    const isValid = this.vnpay.verifyReturn(query);

    if (!isValid) {
      return { success: false, message: 'Chữ ký không hợp lệ!' };
    }

    const responseCode = query['vnp_ResponseCode'];

    return {
      success: responseCode === '00',
      orderId: query['vnp_TxnRef'],
    };
  }
}

export const paymentService = new PaymentService();
