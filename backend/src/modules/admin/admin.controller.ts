import { Request, Response } from 'express';
import { adminService } from './admin.service';
import { successResponse } from '@/shared/utils/response';
import { MESSAGE } from '@/shared/constants/message.constants';
import { StatusCodes } from 'http-status-codes';

export const adminController = {
  approveShop: async (req: Request, res: Response) => {
    const shop = await adminService.approveShop(req.params.id as string);

    successResponse(
      res,
      StatusCodes.OK,
      MESSAGE.ADMIN.APPROVE_SHOP_SUCCESS,
      shop,
    );
  },

  banShop: async (req: Request, res: Response) => {
    const shop = await adminService.banShop(req.params.id as string);

    successResponse(res, StatusCodes.OK, MESSAGE.ADMIN.BAN_SHOP_SUCCESS, shop);
  },

  banUser: async (req: Request, res: Response) => {
    const user = await adminService.banUser(req.params.id as string);

    successResponse(res, StatusCodes.OK, MESSAGE.ADMIN.BAN_USER_SUCCESS, user);
  },

  getStats: async (req: Request, res: Response) => {
    const stats = await adminService.getStats();

    successResponse(
      res,
      StatusCodes.OK,
      MESSAGE.ADMIN.GET_STATS_SUCCESS,
      stats,
    );
  },

  getPendingShops: async (req: Request, res: Response) => {
    const page = Number(req.query.page);
    const limit = Number(req.query.limit);
    const result = await adminService.getPendingShops({ page, limit });

    successResponse(
      res,
      StatusCodes.OK,
      MESSAGE.ADMIN.GET_PENDING_SHOPS_SUCCESS,
      result.data,
      result.meta,
    );
  },

  getUsers: async (req: Request, res: Response) => {
    const result = await adminService.getUsers(req.query);

    successResponse(
      res,
      StatusCodes.OK,
      MESSAGE.ADMIN.GET_USERS_SUCCESS,
      result.data,
      result.meta,
    );
  },

  getOrders: async (req: Request, res: Response) => {
    const result = await adminService.getOrders(req.query);

    successResponse(
      res,
      StatusCodes.OK,
      MESSAGE.ADMIN.GET_ORDERS_SUCCESS,
      result.data,
      result.meta,
    );
  },
};
