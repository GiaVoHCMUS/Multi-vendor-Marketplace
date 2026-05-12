import { CategoryRepository } from '../category/category.repository';
import { ShopRepository } from '../shop/shop.repository';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductRepository } from './repositories/product.repository';

const productService = new ProductService(
  new ProductRepository(),
  new CategoryRepository(),
  new ShopRepository(),
);

export const productController = new ProductController(productService);
