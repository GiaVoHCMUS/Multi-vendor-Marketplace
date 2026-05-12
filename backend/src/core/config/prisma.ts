import { PrismaClient } from '@prisma/client';
import { createPrismaQueryEventHandler } from 'prisma-query-log';

const isDev = process.env.NODE_ENV === 'development';

export const prisma = new PrismaClient({
  log: isDev
    ? [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'info', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ]
    : ['error'],
});

if (isDev) {
  const logHandler = createPrismaQueryEventHandler({
    language: 'sql',
    format: true, // 🌟 QUAN TRỌNG: Nó sẽ thay $1, $2 bằng giá trị thật luôn
    colorQuery: 'blue',
    colorParameter: 'yellow',
    queryDuration: true,
  });

  // Đăng ký sự kiện
  prisma.$on('query' as any, (event: any) => {
    logHandler(event);
  });
}
