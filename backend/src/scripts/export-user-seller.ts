import fs from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:3000/api';
const DEFAULT_PASSWORD = 'hashPassword2005';

async function getUsersAndSellers() {
  const users = await prisma.user.findMany({
    where: {
      role: 'USER',
      password: '$2a$12$us5.CCb8Yak9KJr5LyvXNOwkvczomuCX6h0Lb1HZ40m4sku4DHOCG',
    },
    select: { email: true },
    take: 75,
  });

  const sellers = await prisma.user.findMany({
    where: {
      role: 'SELLER',
      password: '$2a$12$us5.CCb8Yak9KJr5LyvXNOwkvczomuCX6h0Lb1HZ40m4sku4DHOCG',
    },
    select: { email: true },
    take: 15,
  });

  return { users, sellers };
}

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

async function generateTokens(accounts: { email: string }[], outputFile: string) {
  const tokens = [];

  for (const account of accounts) {
    try {
      const token = await login(account.email);

      tokens.push(token);

    } catch (err) {
      console.error((err as any).message);
    }
  }

  await fs.writeFile(outputFile, JSON.stringify(tokens, null, 2));

  console.log(`\nSaved ${tokens.length} tokens -> ${outputFile}`);
}

async function main() {
  const { users, sellers } = await getUsersAndSellers();

  console.log(`Found ${users.length} users`);
  console.log(`Found ${sellers.length} sellers\n`);

  // Export user tokens
  await generateTokens(users, path.join(process.cwd(), 'tests', 'load', 'user_tokens.json'));

  // Export seller tokens
  await generateTokens(sellers, path.join(process.cwd(), 'tests', 'load', 'seller_tokens.json'));
}

main()
  .catch((err) => {
    console.error(err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
