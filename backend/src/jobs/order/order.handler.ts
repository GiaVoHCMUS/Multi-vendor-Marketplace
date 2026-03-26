import { prisma } from '@/core/config/prisma';
import { OrderStatus } from '@prisma/client';
import { mailJob } from '../mail/mail.job';

export const orderHandler = {
  autoCancel: async () => {
    const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const orders = await prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
        createdAt: {
          lt: expiredDate,
        },
      },
      include: {
        orderGroup: {
          include: {
            user: {
              select: {
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!orders.length) return;

    await prisma.order.updateMany({
      where: {
        id: { in: orders.map((o) => o.id) },
      },
      data: {
        status: OrderStatus.CANCELLED,
      },
    });

    // gửi mail async
    await Promise.all(
      orders.map((order) =>
        mailJob.sendOrderCancelled({
          to: order.orderGroup.user.email,
          customerName: order.orderGroup.user.fullName,
          orderId: order.id,
          totalAmount: Number(order.totalAmount),
          shippingAddress: order.orderGroup.shippingAddress,
        }),
      ),
    );

    console.log(`✅ Auto cancelled ${orders.length} orders`);
  },
};
