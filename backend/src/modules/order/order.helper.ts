import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';

/**
 * Check toàn bộ orders của một OrderGroup.
 * Nếu tất cả orders = DELIVERED, tự động cập nhật OrderGroup.paymentStatus = COMPLETED
 * Hàm này luôn sử dụng khi có một order là con của orderGroup mà trở thành DELIVERED
 * Chỉ áp dụng cho phương thức thanh toán COD
 */

export const checkAndCompleteOrderGroup = async (
  tx: Prisma.TransactionClient,
  orderGroupId: string,
) => {
  // Lấy tất cả orders của OrderGroup
  const orders = await tx.order.findMany({
    where: { orderGroupId },
    select: { status: true },
  });

  if (!orders || orders.length === 0) {
    throw new Error('Không tìm thấy đơn hàng nào trong orderGroup này');
  }

  // Kiểm tra tất cả orders đã delivered chưa
  const allDelivered = orders.every(
    (order) => order.status === OrderStatus.DELIVERED,
  );

  if (allDelivered) {
    // Cập nhật OrderGroup
    await tx.orderGroup.update({
      where: { id: orderGroupId },
      data: { paymentStatus: PaymentStatus.COMPLETED },
    });
  }
};
