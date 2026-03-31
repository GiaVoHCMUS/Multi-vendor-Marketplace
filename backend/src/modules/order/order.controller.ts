import { catchAsync } from '@/shared/utils/catchAsync';
import { Request, Response } from 'express';
import { orderService } from './order.service';
import { successResponse } from '@/shared/utils/response';
import { MESSAGE } from '@/shared/constants/message.constants';

export const orderController = {
  checkout: catchAsync(async (req: Request, res: Response) => {
    const ipAddr =
      req.headers['x-forwarded-for']?.toString().split(',')[0] ||
      req.socket.remoteAddress ||
      '';
      
    const order = await orderService.checkout(req.user!.id, ipAddr, req.body);

    successResponse(res, 201, MESSAGE.ORDER.CHECKOUT_SUCCESS, order);
  }),

  getMyOrders: catchAsync(async (req: Request, res: Response) => {
    const orders = await orderService.getMyOrders(req.user!.id, req.query);

    successResponse(res, 200, MESSAGE.ORDER.GET_LIST_SUCCESS, orders);
  }),

  getOrderDetail: catchAsync(async (req: Request, res: Response) => {
    const order = await orderService.getOrderDetail(
      req.user!.id,
      req.params.id as string,
    );

    successResponse(res, 200, MESSAGE.ORDER.GET_DETAIL_SUCCESS, order);
  }),

  updateOrderStatus: catchAsync(async (req: Request, res: Response) => {
    const order = await orderService.updateOrderStatus(
      req.params.id as string,
      req.body.status,
      req.user!.id,
    );

    successResponse(res, 200, MESSAGE.ORDER.UPDATE_STATUS_SUCCESS, order);
  }),
};
