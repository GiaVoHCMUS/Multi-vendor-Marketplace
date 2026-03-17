import { catchAsync } from '@/shared/utils/catchAsync';
import { Request, Response } from 'express';
import { productService } from './product.service';
import { successResponse } from '@/shared/utils/response';
import { ImageType } from '@/shared/types/image.type';
import { imageService } from '@/shared/services/image.service';
import { productSchema } from './product.schema';
import { MESSAGE } from '@/shared/constants/message.constants';

export const productController = {
  getAll: catchAsync(async (req: Request, res: Response) => {
    const { query } = productSchema.productQuery.parse(req);
    const result = await productService.getAll(query);

    successResponse(
      res,
      200,
      MESSAGE.PRODUCT.GET_LIST_SUCCESS,
      result.data,
      result.meta,
    );
  }),

  getBySlug: catchAsync(async (req: Request, res: Response) => {
    const product = await productService.getBySlug(req.params.slug as string);

    successResponse(res, 200, MESSAGE.PRODUCT.GET_DETAIL_SUCCESS, product);
  }),

  create: catchAsync(async (req: Request, res: Response) => {
    let images: ImageType[] = [];

    if (req.files) {
      const files = req.files as Express.Multer.File[];

      images = await imageService.uploadMultiple(files, 'product_images');
    }

    const product = await productService.create(req.body, images);

    successResponse(res, 201, MESSAGE.PRODUCT.CREATED_SUCCESS, product);
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

    successResponse(res, 200, MESSAGE.PRODUCT.UPDATED_SUCCESS, product);
  }),

  delete: catchAsync(async (req: Request, res: Response) => {
    await productService.delete(req.params.id as string);

    successResponse(res, 200, MESSAGE.PRODUCT.DELETED_SUCCESS);
  }),
};
