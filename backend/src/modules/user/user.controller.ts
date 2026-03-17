import { Request, Response } from 'express';
import { catchAsync } from '@/shared/utils/catchAsync';
import { userService } from './user.service';
import { successResponse } from '@/shared/utils/response';
import { imageService } from '@/shared/services/image.service';
import { ImageType } from '@/shared/types/image.type';
import { MESSAGE } from '@/shared/constants/message.constants';

export const userController = {
  getMe: catchAsync(async (req: Request, res: Response) => {
    // Lấy thông tin cá nhân
    const user = await userService.getMe(req.user!.id);
    successResponse(res, 200, MESSAGE.USER.GET_PROFILE_SUCCESS, user);
  }),

  updateMe: catchAsync(async (req: Request, res: Response) => {
    // Cập nhật Profile
    let avatarUrl: ImageType | undefined;
    if (req.file) {
      const image = await imageService.uploadSingle(req.file.buffer, 'avatars');

      avatarUrl = image;
    }
    const user = await userService.updateMe(req.user!.id, req.body, avatarUrl);
    successResponse(res, 200, MESSAGE.USER.UPDATE_PROFILE_SUCCESS, user);
  }),

  getAddresses: catchAsync(async (req: Request, res: Response) => {
    // Lấy danh sách địa chỉ (có dùng caching)
    const list = await userService.getAddresses(req.user!.id);
    successResponse(res, 200, MESSAGE.USER.GET_ADDRESS_LIST_SUCCESS, list);
  }),

  createAddress: catchAsync(async (req: Request, res: Response) => {
    // Tạo địa chỉ mới
    const address = await userService.createAddress(req.user!.id, req.body);
    successResponse(res, 201, MESSAGE.USER.ADD_ADDRESS_SUCCESS, address);
  }),

  updateAddress: catchAsync(async (req: Request, res: Response) => {
    // Cập nhật địa chỉ
    const address = await userService.updateAddress(
      req.user!.id,
      req.params.id as string,
      req.body,
    );
    successResponse(res, 200, MESSAGE.USER.UPDATE_ADDRESS_SUCCESS, address);
  }),

  deleteAddress: catchAsync(async (req: Request, res: Response) => {
    // Xóa địa chỉ
    await userService.deleteAddress(req.user!.id, req.params.id as string);
    successResponse(res, 200, MESSAGE.USER.DELETE_ADDRESS_SUCCESS);
  }),
};
