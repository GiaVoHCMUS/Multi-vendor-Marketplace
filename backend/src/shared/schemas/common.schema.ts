import { z } from 'zod';
import { REGEX } from '../constants/regex.constants';

export const commonRules = {
  // Định dạng ID của  UUID
  id: z.string().regex(REGEX.UUID, 'ID không hợp lệ'),

  // Email sạch sẽ
  email: z
    .string({ message: 'Email bắt buộc phải nhập' })
    .trim()
    .lowercase()
    .pipe(z.email({ message: 'Email không đúng định dạng' })),

  // Mật khẩu bảo mật
  password: z
    .string({ message: 'Mật khẩu là bắt buộc' })
    .min(6, { message: 'Mật khẩu phải từ 6 ký tự' })
    .max(25, { message: 'Mật khẩu quá dài' })
    .regex(REGEX.PASSWORD_UPPERCASE, {
      message: 'Mật khẩu phải có ít nhất 1 chữ hoa',
    })
    .regex(REGEX.PASSWORD_LOWERCASE, {
      message: 'Mật khẩu phải có ít nhất 1 chữ thường',
    })
    .regex(REGEX.PASSWORD_NUMBER, {
      message: 'Mật khẩu phải có ít nhất 1 chữ số',
    }),

  // Thông tin cá nhân
  fullName: z
    .string({ message: 'Họ tên là bắt buộc' })
    .trim()
    .min(2, { message: 'Tên đầy đủ quá ngắn' })
    .max(50, { message: 'Tên đầy đủ quá dài' }),

  phoneNumber: z.string().regex(REGEX.VIETNAM_PHONE, {
    message: 'Số điện thoại Việt Nam không hợp lệ',
  }),

  // Pagination cho Prisma 
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
};
