import express, { Application } from 'express';
import dotenv from 'dotenv';
dotenv.config();
import cookieParser from 'cookie-parser';
import { successResponse } from './shared/utils/response';
import { globalErrorHandler } from './shared/middleware/error.middleware';
import { setupCron } from './jobs/cron';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './core/config/swagger';
import { registerRoutes } from './routes';

const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Middleware để đọc cookie

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
setupCron();

registerRoutes(app);

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

// Global Error Middleware
app.use(globalErrorHandler);

export default app;
