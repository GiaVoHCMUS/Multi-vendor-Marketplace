import { prisma } from '@/core/config/prisma';
import { OrderStatus } from '@prisma/client';
import { mailJob } from '../mail/mail.job';

export const reportHandler = {
  dailyReport: async () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    // group theo shop
    const report = await prisma.order.groupBy({
      by: ['shopId'],
      where: {
        status: OrderStatus.DELIVERED,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    });

    if (!report.length) return;

    const shopIds = report.map((r) => r.shopId);

    const shops = await prisma.shop.findMany({
      where: {
        id: { in: shopIds },
      },
      include: {
        owner: true,
      },
    });

    const shopMap = new Map(shops.map((s) => [s.id, s]));

    await Promise.all(
      report.map((r) => {
        const shop = shopMap.get(r.shopId);
        if (!shop) return;

        return mailJob.sendDailyReport({
          to: shop.owner.email,
          ownerName: shop.owner.fullName,
          shopName: shop.name,
          totalOrders: r._count.id,
          totalRevenue: Number(r._sum.totalAmount || 0),
        });
      }),
    );

    console.log(`📊 Sent daily report to ${report.length} shops`);
  },
};
