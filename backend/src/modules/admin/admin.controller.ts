import { catchAsync } from '@/shared/utils/catchAsync';
import { Request, Response } from 'express';
import { adminService } from './admin.service';
import { successResponse } from '@/shared/utils/response';
import { MESSAGE } from '@/shared/constants/message.constants';

export const adminController = {
  approveShop: catchAsync(async (req: Request, res: Response) => {
    const shop = await adminService.approveShop(req.params.id as string);

    successResponse(res, 200, MESSAGE.ADMIN.APPROVE_SHOP_SUCCESS, shop);
  }),

  banShop: catchAsync(async (req: Request, res: Response) => {
    const shop = await adminService.banShop(req.params.id as string);

    successResponse(res, 200, MESSAGE.ADMIN.BAN_SHOP_SUCCESS, shop);
  }),

  banUser: catchAsync(async (req: Request, res: Response) => {
    const user = await adminService.banUser(req.params.id as string);

    successResponse(res, 200, MESSAGE.ADMIN.BAN_USER_SUCCESS, user);
  }),

  getStats: catchAsync(async (req: Request, res: Response) => {
    const stats = await adminService.getStats();

    successResponse(res, 200, MESSAGE.ADMIN.GET_STATS_SUCCESS, stats);
  }),

  getPendingShops: catchAsync(async (req: Request, res: Response) => {
    const page = Number(req.query.page);
    const limit = Number(req.query.limit);
    const result = await adminService.getPendingShops({ page, limit });

    successResponse(
      res,
      200,
      MESSAGE.ADMIN.GET_PENDING_SHOPS_SUCCESS,
      result.data,
      result.meta,
    );
  }),

  getUsers: catchAsync(async (req: Request, res: Response) => {
    const result = await adminService.getUsers(req.query);

    successResponse(
      res,
      200,
      MESSAGE.ADMIN.GET_USERS_SUCCESS,
      result.data,
      result.meta,
    );
  }),

  getOrders: catchAsync(async (req: Request, res: Response) => {
    const result = await adminService.getOrders(req.query);

    successResponse(
      res,
      200,
      MESSAGE.ADMIN.GET_ORDERS_SUCCESS,
      result.data,
      result.meta,
    );
  }),
};
