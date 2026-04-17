import { Request, Response } from 'express';
import { userService } from './user.service';
import { successResponse } from '@/shared/utils/response';
import { imageService } from '@/shared/services/image.service';
import { ImageType } from '@/shared/types/image.type';
import { MESSAGE } from '@/shared/constants/message.constants';
import { StatusCodes } from 'http-status-codes';

export const userController = {
  getMe: async (req: Request, res: Response) => {
    // Lấy thông tin cá nhân
    const user = await userService.getMe(req.user!.id);
    successResponse(
      res,
      StatusCodes.OK,
      MESSAGE.USER.GET_PROFILE_SUCCESS,
      user,
    );
  },

  updateMe: async (req: Request, res: Response) => {
    // Cập nhật Profile
    let avatarUrl: ImageType | undefined;
    if (req.file) {
      const image = await imageService.uploadSingle(req.file.buffer, 'avatars');

      avatarUrl = image;
    }
    const user = await userService.updateMe(req.user!.id, req.body, avatarUrl);
    successResponse(
      res,
      StatusCodes.OK,
      MESSAGE.USER.UPDATE_PROFILE_SUCCESS,
      user,
    );
  },

  getAddresses: async (req: Request, res: Response) => {
    // Lấy danh sách địa chỉ (có dùng caching)
    const list = await userService.getAddresses(req.user!.id);
    successResponse(
      res,
      StatusCodes.OK,
      MESSAGE.USER.GET_ADDRESS_LIST_SUCCESS,
      list,
    );
  },

  createAddress: async (req: Request, res: Response) => {
    // Tạo địa chỉ mới
    const address = await userService.createAddress(req.user!.id, req.body);
    successResponse(
      res,
      StatusCodes.CREATED,
      MESSAGE.USER.ADD_ADDRESS_SUCCESS,
      address,
    );
  },

  updateAddress: async (req: Request, res: Response) => {
    // Cập nhật địa chỉ
    const address = await userService.updateAddress(
      req.user!.id,
      req.params.id as string,
      req.body,
    );
    successResponse(
      res,
      StatusCodes.OK,
      MESSAGE.USER.UPDATE_ADDRESS_SUCCESS,
      address,
    );
  },

  deleteAddress: async (req: Request, res: Response) => {
    // Xóa địa chỉ
    await userService.deleteAddress(req.user!.id, req.params.id as string);
    successResponse(res, StatusCodes.OK, MESSAGE.USER.DELETE_ADDRESS_SUCCESS);
  },
};
