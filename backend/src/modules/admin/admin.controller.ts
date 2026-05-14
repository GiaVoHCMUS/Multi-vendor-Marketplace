import { Request, Response } from 'express';
import { successResponse } from '@/shared/utils/response';
import { MESSAGE } from '@/shared/constants/message.constants';
import { StatusCodes } from 'http-status-codes';
import { AdminService } from './admin.service';
import { adminSchema } from './admin.schema';

export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  approveShop = async (req: Request, res: Response) => {
    const shop = await this.adminService.approveShop(req.params.id as string);

    successResponse(res, StatusCodes.OK, MESSAGE.ADMIN.APPROVE_SHOP_SUCCESS, shop);
  };

  banShop = async (req: Request, res: Response) => {
    const shop = await this.adminService.banShop(req.params.id as string);

    successResponse(res, StatusCodes.OK, MESSAGE.ADMIN.BAN_SHOP_SUCCESS, shop);
  };

  banUser = async (req: Request, res: Response) => {
    const user = await this.adminService.banUser(req.params.id as string);

    successResponse(res, StatusCodes.OK, MESSAGE.ADMIN.BAN_USER_SUCCESS, user);
  };

  getStats = async (req: Request, res: Response) => {
    const stats = await this.adminService.getStats();

    successResponse(res, StatusCodes.OK, MESSAGE.ADMIN.GET_STATS_SUCCESS, stats);
  };

  getPendingShops = async (req: Request, res: Response) => {
    const page = Number(req.query.page);
    const limit = Number(req.query.limit);
    const result = await this.adminService.getPendingShops({ page, limit });

    successResponse(
      res,
      StatusCodes.OK,
      MESSAGE.ADMIN.GET_PENDING_SHOPS_SUCCESS,
      result.data,
      result.meta,
    );
  };

  getUsers = async (req: Request, res: Response) => {
    const { query } = adminSchema.getUsers.parse(req);
    const result = await this.adminService.getUsers(query);

    successResponse(res, StatusCodes.OK, MESSAGE.ADMIN.GET_USERS_SUCCESS, result.data, result.meta);
  };

  getOrders = async (req: Request, res: Response) => {
    const { query } = adminSchema.getOrders.parse(req);
    const result = await this.adminService.getOrders(query);

    successResponse(
      res,
      StatusCodes.OK,
      MESSAGE.ADMIN.GET_ORDERS_SUCCESS,
      result.data,
      result.meta,
    );
  };
}
