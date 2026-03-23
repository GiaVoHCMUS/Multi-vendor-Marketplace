import { AppError } from './AppError';

export type CursorPayload = Record<string, any>;

export const cursorUtil = {
  encode(payload: CursorPayload): string {
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  },

  decode<T = CursorPayload>(cursor: string): T {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch {
      throw new AppError('Lỗi dữ liệu đầu vào', 400);
    }
  },
};
