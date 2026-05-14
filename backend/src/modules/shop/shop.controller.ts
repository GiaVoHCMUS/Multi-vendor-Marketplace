import { Request, Response } from 'express';
import { successResponse } from '@/shared/utils/response';
import { imageService } from '@/shared/services/image.service';
import { ImageType } from '@/shared/types/image.type';
import { MESSAGE } from '@/shared/constants/message.constants';
import { StatusCodes } from 'http-status-codes';
import { ShopService } from './shop.service';
import { OrderService } from '../order/order.service';
import { shopSchema } from './shop.schema';

export class ShopController {
  constructor(
    private readonly shopService: ShopService,
    private readonly orderService: OrderService,
  ) {}

  register = async (req: Request, res: Response) => {
    let logoUrl: ImageType | undefined;
    if (req.file) {
      const image = await imageService.uploadSingle(req.file.buffer, 'logo');
      logoUrl = image;
    }

    const shop = await this.shopService.register(req.user!.id, req.body, logoUrl);

    successResponse(res, StatusCodes.CREATED, MESSAGE.SHOP.REGISTER_SUCCESS, shop);
  };

  getMyShop = async (req: Request, res: Response) => {
    const shop = await this.shopService.getMyShop(req.user!.id);

    successResponse(res, StatusCodes.OK, MESSAGE.SHOP.GET_MY_SHOP_SUCCESS, shop);
  };

  updateMyShop = async (req: Request, res: Response) => {
    let logoUrl: ImageType | undefined;
    if (req.file) {
      const image = await imageService.uploadSingle(req.file.buffer, 'logo');
      logoUrl = image;
    }
    const shop = await this.shopService.updateMyShop(req.user!.id, req.body, logoUrl);

    successResponse(res, StatusCodes.OK, MESSAGE.SHOP.UPDATE_MY_SHOP_SUCCESS, shop);
  };

  getShopOrders = async (req: Request, res: Response) => {
    const { query } = shopSchema.getShopOrders.parse(req);
    const shop = await this.shopService.getShopByOwner(req.user!.id);

    const { data, meta } = await this.orderService.getShopOrders(shop.id, query);

    successResponse(res, StatusCodes.OK, MESSAGE.SHOP.GET_ORDERS_SUCCESS, data, meta);
  };

  updateOrderStatus = async (req: Request, res: Response) => {
    const shop = await this.shopService.getShopByOwner(req.user!.id);

    const order = await this.orderService.updateOrderStatus(
      shop.id,
      req.params.id as string,
      req.body.status,
    );

    successResponse(res, StatusCodes.OK, MESSAGE.SHOP.UPDATE_ORDER_STATUS_SUCCESS, order);
  };

  getShopAnalytics = async (req: Request, res: Response) => {
    const shop = await this.shopService.getShopByOwner(req.user!.id);

    const data = await this.orderService.getShopAnalytics(shop.id);

    successResponse(res, StatusCodes.OK, MESSAGE.SHOP.GET_ANALYTICS_SUCCESS, data);
  };
}
