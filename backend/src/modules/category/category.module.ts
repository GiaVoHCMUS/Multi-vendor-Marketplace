import { CategoryController } from './category.controller';
import { CategoryRepository } from './category.repository';
import { CategoryService } from './category.service';

const categoryService = new CategoryService(new CategoryRepository());

export const categoryController = new CategoryController(categoryService);
