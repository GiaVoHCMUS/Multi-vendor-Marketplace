/*
  Warnings:

  - The values [PAID] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [MOCK_PAYMENT] on the enum `PaymentMethod` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'HOLDING', 'PAID_OUT');

-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED');
ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentMethod_new" AS ENUM ('COD', 'VNPAY');
ALTER TABLE "order_groups" ALTER COLUMN "paymentMethod" DROP DEFAULT;
ALTER TABLE "order_groups" ALTER COLUMN "paymentMethod" TYPE "PaymentMethod_new" USING ("paymentMethod"::text::"PaymentMethod_new");
ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";
ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";
DROP TYPE "PaymentMethod_old";
ALTER TABLE "order_groups" ALTER COLUMN "paymentMethod" SET DEFAULT 'COD';
COMMIT;

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_orderGroupId_fkey";

-- DropIndex
DROP INDEX "transactions_orderGroupId_key";

-- AlterTable
ALTER TABLE "order_groups" ADD COLUMN     "paidAt" TIMESTAMP(3),
ALTER COLUMN "paymentMethod" SET DEFAULT 'COD';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "payoutAt" TIMESTAMP(3),
ADD COLUMN     "payoutStatus" "PayoutStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "description" TEXT,
ADD COLUMN     "orderId" UUID,
ADD COLUMN     "shopId" UUID,
ALTER COLUMN "orderGroupId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "transactions_orderGroupId_idx" ON "transactions"("orderGroupId");

-- CreateIndex
CREATE INDEX "transactions_orderId_idx" ON "transactions"("orderId");

-- CreateIndex
CREATE INDEX "transactions_shopId_idx" ON "transactions"("shopId");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_orderGroupId_fkey" FOREIGN KEY ("orderGroupId") REFERENCES "order_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;
