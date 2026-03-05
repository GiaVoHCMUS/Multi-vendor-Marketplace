import express from 'express';
import { successResponse } from './utils/response';

const app = express();

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

export default app;
