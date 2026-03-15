import { catchAsync } from '@/shared/utils/catchAsync';
import { Request, Response } from 'express';
import { productService } from './product.service';
import { successResponse } from '@/shared/utils/response';
import { ImageType } from '@/shared/types/image.type';
import { imageService } from '@/shared/services/image.service';

export const productController = {
  getAll: catchAsync(async (req: Request, res: Response) => {
    const products = await productService.getAll();

    successResponse(res, 200, 'Lấy danh sách sản phẩm thành công', products);
  }),

  getBySlug: catchAsync(async (req: Request, res: Response) => {
    const product = await productService.getBySlug(req.params.slug as string);

    successResponse(res, 200, 'Lấy sản phẩm thành công', product);
  }),

  create: catchAsync(async (req: Request, res: Response) => {
    let images: ImageType[] = [];

    if (req.files) {
      const files = req.files as Express.Multer.File[];

      images = await imageService.uploadMultiple(files, 'product_images');
    }

    const product = await productService.create(req.body, images);

    successResponse(res, 201, 'Tạo sản phẩm thành công', product);
  }),

  update: catchAsync(async (req: Request, res: Response) => {
    let images: ImageType[] | undefined;

    if (req.files) {
      const files = req.files as Express.Multer.File[];

      images = await imageService.uploadMultiple(files, 'product_images');
    }

    const product = await productService.update(
      req.params.id as string,
      req.body,
      images,
    );

    successResponse(res, 200, 'Cập nhật sản phẩm thành công', product);
  }),

  delete: catchAsync(async (req: Request, res: Response) => {
    await productService.delete(req.params.id as string);

    successResponse(res, 200, 'Xóa sản phẩm thành công');
  }),
};
