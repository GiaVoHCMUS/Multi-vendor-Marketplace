import { catchAsync } from '@/shared/utils/catchAsync';
import { Request, Response } from 'express';
import { cartService } from './cart.service';
import { successResponse } from '@/shared/utils/response';

export const cartController = {
  getCart: catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const cart = await cartService.getCart(userId);

    successResponse(res, 200, 'Lấy giỏ hàng thành công', cart);
  }),

  addToCart: catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const cart = await cartService.addToCart(userId, req.body);

    successResponse(res, 200, 'Thêm sản phẩm vào giỏ hàng thành công', cart);
  }),

  updateItem: catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const cart = await cartService.updateItem(
      userId,
      req.params.productId as string,
      req.body.quantity,
    );

    successResponse(res, 200, 'Cập nhật giỏ hàng thành công', cart);
  }),

  removeFromCart: catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const cart = await cartService.removeFromCart(
      userId,
      req.params.productId as string,
    );

    successResponse(res, 200, 'Xóa sản phẩm khỏi giỏ thành công', cart);
  }),

  clearCart: catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    await cartService.clearCart(userId);

    successResponse(res, 200, 'Đã xóa toàn bộ giỏ hàng');
  }),
};
