import express, { Application } from 'express';
import dotenv from 'dotenv';
dotenv.config();
import { successResponse } from './utils/response';
import { globalErrorHandler } from './middleware/global.middleware';

const app : Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.use(globalErrorHandler)

export default app;
