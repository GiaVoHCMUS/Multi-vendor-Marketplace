import express, { Application } from 'express';
import dotenv from 'dotenv';
dotenv.config();
import cookieParser from 'cookie-parser';
import { successResponse } from './shared/utils/response';
import { globalErrorHandler } from './shared/middleware/error.middleware';
import { setupCron } from './jobs/cron';
// import swaggerUi from 'swagger-ui-express';
import { registerRoutes } from './routes';
import { loggerMiddleware } from './shared/middleware/logger.middleware';
// import { loadSwagger } from './core/config/swagger';
import { metricsMiddleware, getMetrics } from './shared/middleware/metrics.middleware';
import { publicLimiter } from './core/limiter/limiter.config';
import { rateLimitMiddlware } from './shared/middleware/limiter.middlware';

const app: Application = express();

app.use(loggerMiddleware); // Middleware log ra console.log
app.use(metricsMiddleware); // Middleware đo lường thời gian và số lượng request (Prometheus)

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Middleware để đọc cookie

// const swagger = async () => {
//   const swaggerSpec = await loadSwagger();
//   app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// };
// swagger();

setupCron();

app.get('/metrics', getMetrics);

app.get('/', (req, res) => {
  return successResponse(res, 200, 'API is running', {
    service: 'Node.js Backend',
  });
});

app.get('/health', (req, res) => {
  return successResponse(res, 200, 'Server healthy', {
    uptime: process.uptime(),
  });
});

app.use(rateLimitMiddlware(publicLimiter));

registerRoutes(app);

// Global Error Middleware
app.use(globalErrorHandler);

export default app;
