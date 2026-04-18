import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';

export default defineConfig(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Cấu hình các quy tắc riêng
    rules: {
      'no-console': 'warn', // Cảnh báo khi dùng console.log
      'prefer-const': 'error', // Bắt buộc dùng const nếu biến không thay đổi
      '@typescript-eslint/no-explicit-any': 'warn', // Hạn chế dùng kiểu "any"
      quotes: [2, 'single'],
      'no-undef': 'off',
    },
  },
  {
    // Chỉ định các file cần kiểm tra
    files: ['**/*.ts'],
    // Bỏ qua các thư mục không cần thiết
    ignores: ['node_modules/', 'dist/'],
  },
  eslintConfigPrettier,
);
