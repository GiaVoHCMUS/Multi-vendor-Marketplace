import { Application, Router } from 'express';

import authRoutes from '@/modules/auth/auth.routes';
import userRoutes from '@/modules/user/user.routes';
import shopRoutes from '@/modules/shop/shop.routes';
import categoryRoutes from '@/modules/category/category.routes';
import productRoutes from '@/modules/products/product.routes';
import cartRoutes from '@/modules/cart/cart.routes';
import orderRoutes from '@/modules/order/order.routes';
import adminRoutes from '@/modules/admin/admin.routes';
import paymentRoutes from '@/modules/payment/payment.routes';

export const registerRoutes = (app: Application) => {
  const router = Router();

  router.use('/auth', authRoutes);
  router.use('/users', userRoutes);
  router.use('/shops', shopRoutes);
  router.use('/categories', categoryRoutes);
  router.use('/products', productRoutes);
  router.use('/cart', cartRoutes);
  router.use('/orders', orderRoutes);
  router.use('/admin', adminRoutes);
  router.use('/payment', paymentRoutes);
  app.use('/api', router);
};
