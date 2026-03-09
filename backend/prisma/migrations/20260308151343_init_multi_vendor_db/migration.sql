/*
  Warnings:

  - You are about to drop the column `shopId` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `paymentStatus` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `shippingAddressFull` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `shippingName` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `shippingPhone` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `orderId` on the `transactions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[orderGroupId]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `orderGroupId` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shopId` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orderGroupId` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_shopId_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_userId_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_orderId_fkey";

-- DropIndex
DROP INDEX "order_items_orderId_idx";

-- DropIndex
DROP INDEX "order_items_shopId_idx";

-- DropIndex
DROP INDEX "orders_createdAt_idx";

-- DropIndex
DROP INDEX "orders_userId_status_idx";

-- DropIndex
DROP INDEX "transactions_orderId_key";

-- AlterTable
ALTER TABLE "order_items" DROP COLUMN "shopId";

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "paymentMethod",
DROP COLUMN "paymentStatus",
DROP COLUMN "shippingAddressFull",
DROP COLUMN "shippingName",
DROP COLUMN "shippingPhone",
DROP COLUMN "userId",
ADD COLUMN     "orderGroupId" UUID NOT NULL,
ADD COLUMN     "shopId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "orderId",
ADD COLUMN     "orderGroupId" UUID NOT NULL;

-- CreateTable
CREATE TABLE "order_groups" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'MOCK_PAYMENT',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "shippingName" TEXT NOT NULL,
    "shippingPhone" TEXT NOT NULL,
    "shippingAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_stats" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalRevenue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalNewUsers" INTEGER NOT NULL DEFAULT 0,
    "totalNewShops" INTEGER NOT NULL DEFAULT 0,
    "platformFee" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "system_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_groups_userId_paymentStatus_idx" ON "order_groups"("userId", "paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "system_stats_date_key" ON "system_stats"("date");

-- CreateIndex
CREATE INDEX "order_items_orderId_productId_idx" ON "order_items"("orderId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_orderGroupId_key" ON "transactions"("orderGroupId");

-- AddForeignKey
ALTER TABLE "order_groups" ADD CONSTRAINT "order_groups_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_orderGroupId_fkey" FOREIGN KEY ("orderGroupId") REFERENCES "order_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_orderGroupId_fkey" FOREIGN KEY ("orderGroupId") REFERENCES "order_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
