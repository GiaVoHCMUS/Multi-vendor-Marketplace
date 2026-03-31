/*
  Warnings:

  - The values [STRIPE] on the enum `PaymentMethod` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PaymentMethod_new" AS ENUM ('COD', 'VNPAY', 'MOCK_PAYMENT');
ALTER TABLE "order_groups" ALTER COLUMN "paymentMethod" DROP DEFAULT;
ALTER TABLE "order_groups" ALTER COLUMN "paymentMethod" TYPE "PaymentMethod_new" USING ("paymentMethod"::text::"PaymentMethod_new");
ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";
ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";
DROP TYPE "PaymentMethod_old";
ALTER TABLE "order_groups" ALTER COLUMN "paymentMethod" SET DEFAULT 'MOCK_PAYMENT';
COMMIT;
