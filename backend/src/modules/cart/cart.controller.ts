import { catchAsync } from '@/shared/utils/catchAsync';
import { Request, Response } from 'express';
import { cartService } from './cart.service';
import { successResponse } from '@/shared/utils/response';
import { MESSAGE } from '@/shared/constants/message.constants';

export const cartController = {
  getCart: catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const cart = await cartService.getCart(userId);

    successResponse(res, 200, MESSAGE.CART.GET_DETAIL_SUCCESS, cart);
  }),

  addToCart: catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const cart = await cartService.addToCart(userId, req.body);

    successResponse(res, 200, MESSAGE.CART.ADD_PRODUCT_SUCCESS, cart);
  }),

  updateItem: catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const cart = await cartService.updateItem(
      userId,
      req.params.productId as string,
      req.body.quantity,
    );

    successResponse(res, 200, MESSAGE.CART.UPDATE_SUCCESS, cart);
  }),

  removeFromCart: catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const cart = await cartService.removeFromCart(
      userId,
      req.params.productId as string,
    );

    successResponse(res, 200, MESSAGE.CART.REMOVE_PRODUCT_SUCCESS, cart);
  }),

  clearCart: catchAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const cart = await cartService.clearCart(userId);

    successResponse(res, 200, MESSAGE.CART.CLEAR_SUCCESS, cart);
  }),
};
