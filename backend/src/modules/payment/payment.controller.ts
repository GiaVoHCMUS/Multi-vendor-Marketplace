import { Request, Response } from 'express';
import { paymentService } from './payment.service';
import { successResponse } from '@/shared/utils/response';
import { MESSAGE } from '@/shared/constants/message.constants';
import { StatusCodes } from 'http-status-codes';

export const paymentController = {
  // create payment
  createPayment: async (req: Request, res: Response) => {
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

    successResponse(
      res,
      StatusCodes.OK,
      MESSAGE.ORDER.CHECKOUT_SUCCESS,
      result,
    );
  },

  // return url (frontend redirect)
  vnpayReturn: async (req: Request, res: Response) => {
    const result = await paymentService.handleVNPayReturn(
      req.query as Record<string, string>,
    );

    // redirect về frontend
    if (result.success) {
      res.send('Thanh toán thành công');
      return;
    }

    res.send('Thanh toán thất bại');
  },

  // IPN (server to server)
  vnpayIPN: async (req: Request, res: Response) => {
    try {
      const result = await paymentService.handleVNPayIPN(
        req.query as Record<string, string>,
      );

      return res.status(StatusCodes.OK).json(result);
    } catch (error) {
      console.error('VNPay IPN Error:', error);

      return res.status(200).json({
        RspCode: '99',
        Message: 'Lỗi không xác định',
      });
    }
  },
};
