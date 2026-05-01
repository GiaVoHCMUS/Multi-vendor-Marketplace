import { Request, Response } from 'express';
import { successResponse } from '@/shared/utils/response';
import { MESSAGE } from '@/shared/constants/message.constants';
import { StatusCodes } from 'http-status-codes';
import { CartService } from './cart.service';

export class CartController {
  constructor(private cartService: CartService) {}

  getCart = async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const cart = await this.cartService.getCart(userId);

    successResponse(res, StatusCodes.OK, MESSAGE.CART.GET_DETAIL_SUCCESS, cart);
  };

  addToCart = async (req: Request, res: Response) => {
    const userId = req.user!.id;

    await this.cartService.addToCart(userId, req.body);

    successResponse(res, StatusCodes.OK, MESSAGE.CART.ADD_PRODUCT_SUCCESS);
  };

  updateItem = async (req: Request, res: Response) => {
    const userId = req.user!.id;

    await this.cartService.updateItem(userId, req.params.productId as string, req.body.quantity);

    successResponse(res, StatusCodes.OK, MESSAGE.CART.UPDATE_SUCCESS);
  };

  removeFromCart = async (req: Request, res: Response) => {
    const userId = req.user!.id;

    await this.cartService.removeFromCart(userId, req.params.productId as string);

    successResponse(res, StatusCodes.OK, MESSAGE.CART.REMOVE_PRODUCT_SUCCESS);
  };

  clearCart = async (req: Request, res: Response) => {
    const userId = req.user!.id;

    await this.cartService.clearCart(userId);

    successResponse(res, StatusCodes.OK, MESSAGE.CART.CLEAR_SUCCESS);
  };
}