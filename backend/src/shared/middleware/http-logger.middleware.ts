import pinoHttp from 'pino-http';

import { logger } from '../utils/logger';

export const httpLogger = pinoHttp({
  logger,
  // Chỉ lấy những field cần thiết từ Request
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      query: req.query,
      params: req.params,
      headers: req.headers,
    }),
    // Chỉ lấy statusCode từ Response
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
  // Tùy chỉnh thông báo log cho gọn
  customSuccessMessage: (req, res, responseTime) => {
    return `${req.method} ${req.url} - ${res.statusCode} (${responseTime}ms)`;
  },
  customErrorMessage: (req, res) => {
    return `FAILED: ${req.method} ${req.url} - ${res.statusCode}`;
  },
});
