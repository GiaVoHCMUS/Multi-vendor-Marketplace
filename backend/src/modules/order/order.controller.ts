import { catchAsync } from '@/shared/utils/catchAsync';
import { Request, Response } from 'express';
import { orderService } from './order.service';
import { successResponse } from '@/shared/utils/response';

export const orderController = {
  checkout: catchAsync(async (req: Request, res: Response) => {
    const order = await orderService.checkout(req.user!.id, req.body);

    successResponse(res, 201, 'Thanh toán thành công', order);
  }),

  getMyOrders: catchAsync(async (req: Request, res: Response) => {
    const orders = await orderService.getMyOrders(req.user!.id);

    successResponse(res, 200, 'Lấy danh sách đơn hàng thành công', orders);
  }),

  getOrderDetail: catchAsync(async (req: Request, res: Response) => {
    const order = await orderService.getOrderDetail(
      req.user!.id,
      req.params.id as string,
    );

    successResponse(res, 200, 'Lấy chi tiết đơn hàng thành công', order);
  }),

  updateOrderStatus: catchAsync(async (req: Request, res: Response) => {
    const order = await orderService.updateOrderStatus(
      req.params.id as string,
      req.body.status,
      req.user!.id,
    );

    successResponse(res, 200, 'Cập nhật trạng thái đơn hàng thành công', order);
  }),
};
