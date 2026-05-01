import { Request, Response } from 'express';
import { cartService } from './cart.module'; 
import { successResponse } from '@/shared/utils/response';
import { MESSAGE } from '@/shared/constants/message.constants';
import { StatusCodes } from 'http-status-codes';

export const cartController = {
  getCart: async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const cart = await cartService.getCart(userId);

    successResponse(res, StatusCodes.OK, MESSAGE.CART.GET_DETAIL_SUCCESS, cart);
  },

  addToCart: async (req: Request, res: Response) => {
    const userId = req.user!.id;

    await cartService.addToCart(userId, req.body);

    successResponse(res, StatusCodes.OK, MESSAGE.CART.ADD_PRODUCT_SUCCESS);
  },

  updateItem: async (req: Request, res: Response) => {
    const userId = req.user!.id;

    await cartService.updateItem(
      userId,
      req.params.productId as string,
      req.body.quantity,
    );

    successResponse(res, StatusCodes.OK, MESSAGE.CART.UPDATE_SUCCESS);
  },

  removeFromCart: async (req: Request, res: Response) => {
    const userId = req.user!.id;

    await cartService.removeFromCart(userId, req.params.productId as string);

    successResponse(res, StatusCodes.OK, MESSAGE.CART.REMOVE_PRODUCT_SUCCESS);
  },

  clearCart: async (req: Request, res: Response) => {
    const userId = req.user!.id;

    await cartService.clearCart(userId);

    successResponse(res, StatusCodes.OK, MESSAGE.CART.CLEAR_SUCCESS);
  },
};
