import { catchAsync } from '@/shared/utils/catchAsync';
import { Request, Response } from 'express';
import { adminService } from './admin.service';
import { successResponse } from '@/shared/utils/response';

export const adminController = {
  approveShop: catchAsync(async (req: Request, res: Response) => {
    const shop = await adminService.approveShop(req.params.id as string);

    successResponse(res, 200, 'Duyệt cửa hàng thành công', shop);
  }),

  banShop: catchAsync(async (req: Request, res: Response) => {
    const shop = await adminService.banShop(req.params.id as string);

    successResponse(res, 200, 'Cửa hàng đã bị khóa', shop);
  }),

  banUser: catchAsync(async (req: Request, res: Response) => {
    const user = await adminService.banUser(req.params.id as string);

    successResponse(res, 200, 'Người dùng đã bị khóa', user);
  }),

  getStats: catchAsync(async (req: Request, res: Response) => {
    const stats = await adminService.getStats();

    successResponse(res, 200, 'Thống kê hệ thống', stats);
  }),

  getPendingShops: catchAsync(async (req: Request, res: Response) => {
    const page = Number(req.query.page);
    const limit = Number(req.query.limit);
    const result = await adminService.getPendingShops({ page, limit });

    successResponse(
      res,
      200,
      'Danh sách cửa hàng chờ duyệt',
      result.data,
      result.meta,
    );
  }),

  getUsers: catchAsync(async (req: Request, res: Response) => {
    const result = await adminService.getUsers(req.query);

    successResponse(
      res,
      200,
      'Danh sách người dùng',
      result.data,
      result.meta,
    );
  }),

  getOrders: catchAsync(async (req: Request, res: Response) => {
    const result = await adminService.getOrders(req.query);

    successResponse(
      res,
      200,
      'Danh sách đơn hàng',
      result.data,
      result.meta,
    );
  }),
};
