import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function exportCategories() {
  console.log('Đang lấy danh sách Category...');

  const categories = await prisma.category.findMany({
    select: { slug: true },
  });

  const slugs = categories.map((c) => c.slug);

  const outputPath = path.join(process.cwd(), 'tests', 'load', 'category_slugs.json');
  fs.writeFileSync(outputPath, JSON.stringify(slugs, null, 2));

  console.log(`Đã xuất ${slugs.length} Category Slugs ra file: ${outputPath}`);
}

exportCategories()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
