import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:3000/api';
const TARGET_PRODUCT_ID = '48a8e092-d146-4d5a-b900-32013e7a37d0';
const NUM_USERS = 100;

// Hàm lấy token đăng nhập
const DEFAULT_PASSWORD = 'hashPassword2005';
async function login(email: string, password: string = DEFAULT_PASSWORD) {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(`Login failed for ${email}`);
  }

  const data = await response.json();

  // chỉnh theo response thật của bạn
  return data.data.accessToken;
}

async function seedCartAndTokens() {
  const users = await prisma.user.findMany({
    where: {
      role: 'USER',
      password: '$2a$12$us5.CCb8Yak9KJr5LyvXNOwkvczomuCX6h0Lb1HZ40m4sku4DHOCG',
    },
    select: { email: true, id: true },
    take: NUM_USERS,
  });

  console.log(users);

  const checkoutUsers: string[] = [];

  for (const user of users) {
    try {
      const token = await login(user.email);
      console.log(token);

      const cartRes = await fetch(`${BASE_URL}/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: TARGET_PRODUCT_ID,
          quantity: 1,
        }),
      });

      if (!cartRes.ok) {
        const err = await cartRes.text();
        console.error(`Lỗi thêm vào giỏ:`, err);
      }

      // 3. Đẩy thông tin vào mảng nếu mọi thứ trót lọt
      checkoutUsers.push(token);
    } catch (error: any) {
      console.error(`[User] Lỗi:`, error.message);
    }
  }
  const outputPath = path.join(process.cwd(), 'tests', 'load', 'checkout-users.json');
  fs.writeFileSync(outputPath, JSON.stringify(checkoutUsers, null, 2));
}

seedCartAndTokens()
  .catch((err) => {
    console.error(err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
