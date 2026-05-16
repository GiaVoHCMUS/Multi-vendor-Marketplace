import client from 'prom-client';
import { Request, Response, NextFunction } from 'express';

/**
 * Route label cho Prometheus: luôn là pattern đã đăng ký (vd. /api/products, /api/products/:slug),
 * không dùng slug/id thật → cardinality thấp, dễ filter Grafana.
 */
function metricRouteLabel(req: Request): string {
  if (!req.route?.path) {
    const base = req.baseUrl || '';
    return base ? `${base}/*` : '/*';
  }

  const tail = req.route.path === '/' ? '' : req.route.path;
  const joined = `${req.baseUrl ?? ''}${tail}`;
  return joined.replace(/\/{2,}/g, '/') || '/';
}

// Khởi tạo Registry và thu thập các chỉ số mặc định của Node.js (RAM, CPU)
const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

// Chỉ số 1: Tổng số request
const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Tổng số request gọi vào API',
  labelNames: ['method', 'route', 'status'],
  registers: [registry],
});

// Chỉ số 2: Tốc độ phản hồi (Histogram)
const httpRequestDurationHistogram = new client.Histogram({
  name: 'http_requests_duration_seconds',
  help: 'Thời gian xử lý 1 request (giây)',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [registry],
});

// Middleware đo lường
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime();

  res.on('finish', () => {
    if (req.path === '/metrics') return;

    const route = metricRouteLabel(req);
    const method = req.method;
    const status = res.statusCode.toString();

    httpRequestCounter.labels(method, route, status).inc();

    const end = process.hrtime(start);
    const durationInSeconds = (end[0] * 1e9 + end[1]) / 1e9;

    httpRequestDurationHistogram.labels(method, route, status).observe(durationInSeconds);
  });

  next();
};

export const getMetrics = async (req: Request, res: Response) => {
  res.set('Content-Type', registry.contentType);
  res.send(await registry.metrics());
};
