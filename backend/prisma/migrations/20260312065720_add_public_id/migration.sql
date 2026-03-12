/*
  Warnings:

  - Added the required column `district` to the `addresses` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `images` on the `products` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropIndex
DROP INDEX "products_name_idx";

-- AlterTable
ALTER TABLE "addresses" ADD COLUMN     "district" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "imagePublicId" TEXT;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "images",
ADD COLUMN     "images" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "logoPublicId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatarPublicId" TEXT;

-- CreateIndex
CREATE INDEX "products_name_status_idx" ON "products"("name", "status");
