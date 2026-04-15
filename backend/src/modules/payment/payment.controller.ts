import { Request, Response } from 'express';
import { paymentService } from './payment.service';
import { catchAsync } from '@/shared/utils/catchAsync';
import { successResponse } from '@/shared/utils/response';
import { MESSAGE } from '@/shared/constants/message.constants';

export const paymentController = {
  // create payment
  createPayment: catchAsync(async (req: Request, res: Response) => {
    const { orderGroupId, provider } = req.body;

    let ipAddr =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket.remoteAddress ||
      '127.0.0.1'; // Lấy IP thật của client

    if (ipAddr === '::1') ipAddr = '127.0.0.1';

    const result = await paymentService.createPayment({
      orderGroupId,
      provider,
      ipAddr,
    });

    successResponse(res, 200, MESSAGE.ORDER.CHECKOUT_SUCCESS, result);
  }),

  // return url (frontend redirect)
  vnpayReturn: catchAsync(async (req: Request, res: Response) => {
    const result = await paymentService.handleVNPayReturn(
      req.query as Record<string, string>,
    );

    // redirect về frontend
    if (result.success) {
      res.send('Thanh toán thành công');
      return;
    }

    res.send('Thanh toán thất bại');
  }),

  // IPN (server to server)
  vnpayIPN: async (req: Request, res: Response) => {
    try {
      const result = await paymentService.handleVNPayIPN(
        req.query as Record<string, string>,
      );

      return res.status(200).json(result);
    } catch (error) {
      console.error('VNPay IPN Error:', error);

      return res.status(200).json({
        RspCode: '99',
        Message: 'Lỗi không xác định',
      });
    }
  },
};
