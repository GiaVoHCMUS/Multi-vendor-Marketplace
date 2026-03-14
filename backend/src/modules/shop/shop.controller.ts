import { catchAsync } from '@/shared/utils/catchAsync';
import { Request, Response } from 'express';
import { shopService } from './shop.service';
import { successResponse } from '@/shared/utils/response';
import { imageService } from '@/shared/services/image.service';
import { ImageType } from '@/shared/types/image.type';

export const shopController = {
  register: catchAsync(async (req: Request, res: Response) => {
    // Logic đăng ký shop
    let logoUrl: ImageType | undefined;
    if (req.file) {
      const image = await imageService.uploadSingle(req.file.buffer, 'logo');
      logoUrl = image;
    }

    const shop = await shopService.register(req.user!.id, req.body, logoUrl);

    successResponse(res, 201, 'Đăng ký cửa hàng thành công', shop);
  }),

  getMyShop: catchAsync(async (req: Request, res: Response) => {
    // Xem thông tin của shop
    const shop = await shopService.getMyShop(req.user!.id);

    successResponse(res, 200, 'Lấy thông tin cửa hàng thành công', shop);
  }),

  updateMyShop: catchAsync(async (req: Request, res: Response) => {
    // Cập nhật thông tin của shop
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

    successResponse(res, 200, 'Cập nhật thông tin thành công', shop);
  }),

  getShopOrders: catchAsync(async (req: Request, res: Response) => {
    // Lấy các đơn hàng của Shop
    const { cursor, limit } = req.query;
    const { data, meta } = await shopService.getShopOrders(
      req.user!.id,
      cursor as string,
      Number(limit) || 10,
    );

    successResponse(res, 200, 'Lấy đơn hàng thành công', data, meta);
  }),

  updateOrderStatus: catchAsync(async (req: Request, res: Response) => {
    // Cập nhật trạng thái đơn hàng
    const order = await shopService.updateOrderStatus(
      req.user!.id,
      req.params.id as string,
      req.body.status,
    );

    successResponse(res, 200, 'Cập nhật trạng thái đơn hàng thành công', order);
  }),

  getShopAnalytics: catchAsync(async (req: Request, res: Response) => {
    // Lấy phân tích về shop
    const data = await shopService.getShopAnalytics(req.user!.id);

    successResponse(res, 200, 'Lấy phân tích cho cửa hàng thành công', data);
  }),
};
