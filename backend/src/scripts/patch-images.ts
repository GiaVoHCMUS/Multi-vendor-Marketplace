import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function patchMissingImages() {
  console.log('Bắt đầu tìm và vá ảnh cho các sản phẩm bị thiểu ảnh.');

  // Tìm tất cả ID của sản phẩm chưa có ảnh nào.
  const productsWithoutImages = await prisma.product.findMany({
    where: { images: { none: {} } },
    select: { id: true },
  });
  console.log(`Tìm thấy ${productsWithoutImages.length} sản phẩm cần vá ảnh.`);

  if (productsWithoutImages.length === 0) {
    console.log('Tất cả sản phẩm đã có ảnh, không cần làm gì thêm.');
    return;
  }

  // Dùng CreateMany để vá nhanh 
  const BATCH_SIZE = 5000;
  for (let i = 0; i < productsWithoutImages.length; i += BATCH_SIZE) {
    const batch = productsWithoutImages.slice(i, i + BATCH_SIZE);

    const imagePayloads = batch.map((product) => ({
      productId: product.id,
      url: 'https://res.cloudinary.com/demo/image/upload/v1234567/sample_product_image_for_load_test.jpg',
      publicId: 'sample_product_image_for_load_test',
      order: 0,
    }));

    await prisma.productImage.createMany({ data: imagePayloads });
    console.log(`Đã vá xong: ${i + batch.length}/${productsWithoutImages.length}`);
  }
}

patchMissingImages().finally(() => prisma.$disconnect());
