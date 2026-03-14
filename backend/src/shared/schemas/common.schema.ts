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

  provice: z
    .string({ message: 'Nhập Tỉnh/Thành phố là bắt buộc' })
    .trim()
    .min(2, { message: 'Tỉnh/Thành phố không hợp lệ' }),

  ward: z
    .string({ message: 'Nhập Phường/Xã là bắt buộc' })
    .trim()
    .min(2, { message: 'Phường/Xã không hợp lệ' }),

  detailAddress: z
    .string({ message: 'Địa chỉ chi tiết là bắt buộc' })
    .trim()
    .min(5, { message: 'Địa chỉ quá ngắn' })
    .max(255, { message: 'Đại chỉ quá dài' }),

  shopName: z
    .string({ message: 'Tên cửa hàng là bắt buộc' })
    .trim()
    .min(5, { message: 'Tên cửa hàng là quá ngắn' })
    .max(255, { message: 'Tên cửa hàng quá dài' }),

  shopDescription: z
    .string()
    .max(1000, { message: 'Mô tả về cửa hàng quá dài' })
    .optional(),

  // Pagination cho Prisma
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
};

export const emptySchema = z.object({}).optional();
