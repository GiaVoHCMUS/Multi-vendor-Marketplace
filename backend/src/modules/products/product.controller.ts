import { Request, Response } from 'express';
import { ProductService } from './product.service';
import { successResponse } from '@/shared/utils/response';
import { ImageType } from '@/shared/types/image.type';
import { imageService } from '@/shared/services/image.service';
import { productSchema } from './product.schema';
import { MESSAGE } from '@/shared/constants/message.constants';
import { StatusCodes } from 'http-status-codes';

export class ProductController {
  constructor(private readonly productService: ProductService) {}

  getAll = async (req: Request, res: Response) => {
    const { query } = productSchema.getAll.parse(req);
    const result = await this.productService.getAll(query);

    successResponse(
      res,
      StatusCodes.OK,
      MESSAGE.PRODUCT.GET_LIST_SUCCESS,
      result.data,
      result.meta,
    );
  };

  getBySlug = async (req: Request, res: Response) => {
    const product = await this.productService.getBySlug(req.params.slug as string);

    successResponse(res, StatusCodes.OK, MESSAGE.PRODUCT.GET_DETAIL_SUCCESS, product);
  };

  create = async (req: Request, res: Response) => {
    let images: ImageType[] = [];

    if (req.files) {
      const files = req.files as Express.Multer.File[];

      images = await imageService.uploadMultiple(files, 'product_images');
    }

    const product = await this.productService.create(req.user!.id, req.body, images);

    successResponse(res, StatusCodes.OK, MESSAGE.PRODUCT.CREATED_SUCCESS, product);
  };

  update = async (req: Request, res: Response) => {
    let images: ImageType[] | undefined;

    if (req.files) {
      const files = req.files as Express.Multer.File[];

      images = await imageService.uploadMultiple(files, 'product_images');
    }

    const product = await this.productService.update(req.params.id as string, req.body, images);

    successResponse(res, StatusCodes.OK, MESSAGE.PRODUCT.UPDATED_SUCCESS, product);
  };

  delete = async (req: Request, res: Response) => {
    await this.productService.delete(req.params.id as string);

    successResponse(res, StatusCodes.OK, MESSAGE.PRODUCT.DELETED_SUCCESS);
  };
}
