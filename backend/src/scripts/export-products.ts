import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function exportIds() {
  console.log('Đang lấy danh sách ID từ database...');

  // Lấy 300 ID sản phẩm ngẫu nhiên
  const products = await prisma.product.findMany({
    select: { slug: true, id: true },
    take: 300,
  });

  const slugs = products.map((p) => p.slug);
  const ids: string[] = [];
  for (let i: number = 0; i < 100; ++i) {
    ids.push(products[i].id)
  }

  // Đường dẫn lưu file (lưu vào cùng thư mục chạy k6)
  const outputPathSlugs = path.join(process.cwd(), 'tests', 'load', 'product_slugs.json');
  const outputPathIds = path.join(process.cwd(), 'tests', 'load', 'product_ids.json');

  fs.writeFileSync(outputPathSlugs, JSON.stringify(slugs, null, 2));
  fs.writeFileSync(outputPathIds, JSON.stringify(ids, null, 2));


  console.log(`Đã xuất ${slugs.length} Slugs ra file: ${outputPathSlugs}`);
  console.log(`Đã xuất ${ids.length} Ids ra file: ${outputPathIds}`);
}

exportIds()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
