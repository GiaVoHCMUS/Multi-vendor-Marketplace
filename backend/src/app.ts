import express, { Application } from 'express';
import dotenv from 'dotenv';
dotenv.config();
import cookieParser from 'cookie-parser';
import { successResponse } from './shared/utils/response';
import { globalErrorHandler } from './shared/middleware/error.middleware';
import { setupCron } from './jobs/cron';
// import swaggerUi from 'swagger-ui-express';
import { registerRoutes } from './routes';
// import { loadSwagger } from './core/config/swagger';
import { httpLogger } from './shared/middleware/http-logger.middleware';
import cors from 'cors';

const app: Application = express();

app.use(httpLogger);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Middleware để đọc cookie

// const swagger = async () => {
//   const swaggerSpec = await loadSwagger();
//   app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// };
// swagger();
app.use(cors());
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
