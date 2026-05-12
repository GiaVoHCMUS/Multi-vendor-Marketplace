import { Request, Response } from 'express';
import { successResponse } from '@/shared/utils/response';
import { ImageType } from '@/shared/types/image.type';
import { imageService } from '@/shared/services/image.service';
import { MESSAGE } from '@/shared/constants/message.constants';
import { StatusCodes } from 'http-status-codes';
import { CategoryService } from './category.service';

export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  getAllCategories = async (req: Request, res: Response) => {
    const categories = await this.categoryService.getAll();

    successResponse(res, StatusCodes.OK, MESSAGE.CATEGORY.GET_LIST_SUCCESS, categories);
  };

  getCategoryBySlug = async (req: Request, res: Response) => {
    const category = await this.categoryService.getBySlug(req.params.slug as string);

    successResponse(res, StatusCodes.OK, MESSAGE.CATEGORY.GET_DETAIL_SUCCESS, category);
  };

  create = async (req: Request, res: Response) => {
    let categoryUrl: ImageType | undefined;
    if (req.file) {
      const image = await imageService.uploadSingle(req.file.buffer, 'category_image');
      categoryUrl = image;
    }

    const category = await this.categoryService.create(req.body, categoryUrl);

    successResponse(res, StatusCodes.CREATED, MESSAGE.CATEGORY.CREATED_SUCCESS, category);
  };

  update = async (req: Request, res: Response) => {
    let categoryUrl: ImageType | undefined;
    if (req.file) {
      const image = await imageService.uploadSingle(req.file.buffer, 'category_image');
      categoryUrl = image;
    }

    const category = await this.categoryService.update(
      Number(req.params.id),
      req.body,
      categoryUrl,
    );

    successResponse(res, StatusCodes.OK, MESSAGE.CATEGORY.UPDATED_SUCCESS, category);
  };

  delete = async (req: Request, res: Response) => {
    await this.categoryService.delete(Number(req.params.id));

    successResponse(res, StatusCodes.OK, MESSAGE.CATEGORY.DELETED_SUCCESS);
  };
}
