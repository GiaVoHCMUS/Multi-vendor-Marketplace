import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function exportIds() {
  console.log('Đang lấy danh sách ID từ database...');

  // Lấy 5000 ID sản phẩm ngẫu nhiên
  const products = await prisma.product.findMany({
    select: { slug: true },
    take: 5000,
  });

  const slugs = products.map((p) => p.slug);

  // Đường dẫn lưu file (lưu vào cùng thư mục chạy k6)
  const outputPath = path.join(process.cwd(), 'tests', 'load', 'product_ids.json');

  fs.writeFileSync(outputPath, JSON.stringify(slugs, null, 2));

  console.log(`Đã xuất ${slugs.length} ID ra file: ${outputPath}`);
}

exportIds()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
