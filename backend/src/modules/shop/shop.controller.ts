import { catchAsync } from '@/shared/utils/catchAsync';
import { Request, Response } from 'express';
import { shopService } from './shop.service';
import { successResponse } from '@/shared/utils/response';
import { imageService } from '@/shared/services/image.service';
import { ImageType } from '@/shared/types/image.type';
import { MESSAGE } from '@/shared/constants/message.constants';

export const shopController = {
  register: catchAsync(async (req: Request, res: Response) => {
    let logoUrl: ImageType | undefined;
    if (req.file) {
      const image = await imageService.uploadSingle(req.file.buffer, 'logo');
      logoUrl = image;
    }

    const shop = await shopService.register(req.user!.id, req.body, logoUrl);

    successResponse(res, 201, MESSAGE.SHOP.REGISTER_SUCCESS, shop);
  }),

  getMyShop: catchAsync(async (req: Request, res: Response) => {
    const shop = await shopService.getMyShop(req.user!.id);

    successResponse(res, 200, MESSAGE.SHOP.GET_MY_SHOP_SUCCESS, shop);
  }),

  updateMyShop: catchAsync(async (req: Request, res: Response) => {
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

    successResponse(res, 200, MESSAGE.SHOP.UPDATE_MY_SHOP_SUCCESS, shop);
  }),

  getShopOrders: catchAsync(async (req: Request, res: Response) => {
    const { data, meta } = await shopService.getShopOrders(
      req.user!.id,
      req.query,
    );

    successResponse(res, 200, MESSAGE.SHOP.GET_ORDERS_SUCCESS, data, meta);
  }),

  updateOrderStatus: catchAsync(async (req: Request, res: Response) => {
    const order = await shopService.updateOrderStatus(
      req.user!.id,
      req.params.id as string,
      req.body.status,
    );

    successResponse(res, 200, MESSAGE.SHOP.UPDATE_ORDER_STATUS_SUCCESS, order);
  }),

  getShopAnalytics: catchAsync(async (req: Request, res: Response) => {
    const data = await shopService.getShopAnalytics(req.user!.id);

    successResponse(res, 200, MESSAGE.SHOP.GET_ANALYTICS_SUCCESS, data);
  }),
};
