import { Request, Response } from 'express';
import { OrderService } from './order.service';
import { successResponse } from '@/shared/utils/response';
import { MESSAGE } from '@/shared/constants/message.constants';
import { StatusCodes } from 'http-status-codes';

export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  checkout = async (req: Request, res: Response) => {
    const ipAddr =
      req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || '';

    const order = await this.orderService.checkout(req.user!.id, ipAddr, req.body);

    successResponse(res, StatusCodes.CREATED, MESSAGE.ORDER.CHECKOUT_SUCCESS, order);
  };

  getMyOrders = async (req: Request, res: Response) => {
    const { orders, meta } = await this.orderService.getMyOrders(req.user!.id, req.query);

    successResponse(res, StatusCodes.OK, MESSAGE.ORDER.GET_LIST_SUCCESS, orders, meta);
  };

  getOrderDetail = async (req: Request, res: Response) => {
    const order = await this.orderService.getOrderDetail(req.user!.id, req.params.id as string);

    successResponse(res, StatusCodes.OK, MESSAGE.ORDER.GET_DETAIL_SUCCESS, order);
  };
}
