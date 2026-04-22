import { PrismaClient, UserRole, ShopStatus, ProductStatus } from '@prisma/client';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Hàm chuyển đổi tiếng Việt và tạo slug + 6 ký tự ngẫu nhiên
function generateSlug(text: string): string {
  const slug = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/([^0-9a-z-\s])/g, '')
    .replace(/(\s+)/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${slug}-${faker.string.alphanumeric(6)}`;
}

async function main() {
  console.log('Bắt đầu quá trình Fake Data...');

  // 1. Lấy danh sách Category ID hiện có
  const categories = await prisma.category.findMany({ select: { id: true } });
  const categoryIds = categories.map((c) => c.id);

  if (categoryIds.length === 0) {
    throw new Error('Chưa có category nào trong DB. Hãy thêm category trước nhé!');
  }

  // 2. Tạo 20 Sellers & 20 Shops (Dùng vòng lặp tạo lẻ để lấy ID Shop)
  console.log('Đang tạo 20 Sellers và Shops...');
  const hashedPassword = await bcrypt.hash('HashedPassword', 12);

  const shopIds: string[] = [];
  for (let i = 0; i < 20; i++) {
    const shopName = faker.company.name();
    const seller = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        password: hashedPassword,
        fullName: faker.person.fullName(),
        role: UserRole.SELLER,
        isVerified: true,
        shop: {
          create: {
            name: shopName,
            slug: generateSlug(shopName),
            status: ShopStatus.ACTIVE,
            balance: 0,
          },
        },
      },
      include: { shop: true },
    });
    if (seller.shop) shopIds.push(seller.shop.id);
  }

  // 3. Tạo 100 Users (Khách mua hàng)
  console.log('Đang tạo 100 Users...');
  const usersData = Array.from({ length: 100 }).map(() => ({
    email: faker.internet.email(),
    password: hashedPassword,
    fullName: faker.person.fullName(),
    role: UserRole.USER,
    isVerified: true,
  }));
  await prisma.user.createMany({ data: usersData });

  // 4. Tạo 100,000 Sản phẩm (Sử dụng cơ chế Batch Insert)
  const TOTAL_PRODUCTS = 100000;
  const BATCH_SIZE = 5000; // Mỗi đợt insert 5k cái để tránh lỗi bộ nhớ
  console.log(`Đang chuẩn bị insert ${TOTAL_PRODUCTS} sản phẩm...`);

  for (let i = 0; i < TOTAL_PRODUCTS; i += BATCH_SIZE) {
    const productsBatch = Array.from({ length: BATCH_SIZE }).map(() => {
      const productName = faker.commerce.productName();
      return {
        name: productName,
        slug: generateSlug(productName),
        description: faker.commerce.productDescription(),
        price: parseFloat(faker.commerce.price({ min: 50000, max: 10000000 })),
        stock: faker.number.int({ min: 5, max: 1000 }),
        status: ProductStatus.PUBLISHED,
        shopId: faker.helpers.arrayElement(shopIds),
        categoryId: faker.helpers.arrayElement(categoryIds),
      };
    });

    await prisma.product.createMany({
      data: productsBatch,
      skipDuplicates: true, // Tránh lỗi nếu trùng slug ngẫu nhiên
    });

    console.log(`Đã xong: ${i + BATCH_SIZE}/${TOTAL_PRODUCTS} sản phẩm`);
  }

  console.log('Hoàn thành! Hệ thống đã sẵn sàng với dữ liệu mới được thêm vào.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
