import { Request, Response, NextFunction } from 'express';
import { tokenUtils } from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { prisma } from '@/config/prisma';
import { AuthUser } from '../types/express';
import { catchAsync } from '../utils/catchAsync';
import { UserRole } from '@prisma/client';

// Middleware bảo vệ Route (Yêu cầu người dùng phải login mới được sử dụng)
export const protect = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    let token: string | undefined;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(
        new AppError(
          'Bạn chưa đăng nhập. Vui lòng đăng nhập để truy cập.',
          401,
        ),
      );
    }

    const decoded = tokenUtils.verifyAccessToken(token);

    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        bio: true,
        role: true,
      },
    });

    if (!currentUser) {
      return next(new AppError('Người dùng này đã không còn tồn tại.', 404));
    }

    req.user = currentUser as AuthUser;

    next();
  },
);

// Middleware phân quyền
export const restrictTo = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Bạn chưa đăng nhập', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('Bạn không có quyền thực hiện hành động này', 403),
      );
    }
    
    next();
  };
};
