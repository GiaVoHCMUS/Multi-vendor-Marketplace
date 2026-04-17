import { Request, Response } from 'express';
import { shopService } from './shop.service';
import { successResponse } from '@/shared/utils/response';
import { imageService } from '@/shared/services/image.service';
import { ImageType } from '@/shared/types/image.type';
import { MESSAGE } from '@/shared/constants/message.constants';
import { StatusCodes } from 'http-status-codes';

export const shopController = {
  register: async (req: Request, res: Response) => {
    let logoUrl: ImageType | undefined;
    if (req.file) {
      const image = await imageService.uploadSingle(req.file.buffer, 'logo');
      logoUrl = image;
    }

    const shop = await shopService.register(req.user!.id, req.body, logoUrl);

    successResponse(
      res,
      StatusCodes.CREATED,
      MESSAGE.SHOP.REGISTER_SUCCESS,
      shop,
    );
  },

  getMyShop: async (req: Request, res: Response) => {
    const shop = await shopService.getMyShop(req.user!.id);

    successResponse(
      res,
      StatusCodes.OK,
      MESSAGE.SHOP.GET_MY_SHOP_SUCCESS,
      shop,
    );
  },

  updateMyShop: async (req: Request, res: Response) => {
    let logoUrl: ImageType | undefined;
    if (req.file) {
      const image = await imageService.uploadSingle(req.file.buffer, 'logo');
      logoUrl = image;
    }
    const shop = await shopService.updateMyShop(
      req.user!.id,
      req.body,
      logoUrl,
    );

    successResponse(
      res,
      StatusCodes.OK,
      MESSAGE.SHOP.UPDATE_MY_SHOP_SUCCESS,
      shop,
    );
  },

  getShopOrders: async (req: Request, res: Response) => {
    const { data, meta } = await shopService.getShopOrders(
      req.user!.id,
      req.query,
    );

    successResponse(
      res,
      StatusCodes.OK,
      MESSAGE.SHOP.GET_ORDERS_SUCCESS,
      data,
      meta,
    );
  },

  updateOrderStatus: async (req: Request, res: Response) => {
    const order = await shopService.updateOrderStatus(
      req.user!.id,
      req.params.id as string,
      req.body.status,
    );

    successResponse(
      res,
      StatusCodes.OK,
      MESSAGE.SHOP.UPDATE_ORDER_STATUS_SUCCESS,
      order,
    );
  },

  getShopAnalytics: async (req: Request, res: Response) => {
    const data = await shopService.getShopAnalytics(req.user!.id);

    successResponse(
      res,
      StatusCodes.OK,
      MESSAGE.SHOP.GET_ANALYTICS_SUCCESS,
      data,
    );
  },
};
