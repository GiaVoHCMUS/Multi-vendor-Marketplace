import { UserRole } from '@prisma/client';

export type AuthUser = {
  id: string;
  role: UserRole;
};

// Chúng ta phải bọc trong 'declare global' để TypeScript hiểu
// là đang mở rộng không gian tên toàn cầu
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Luôn cần dòng này để TS coi đây là một module ES2015
export {};
