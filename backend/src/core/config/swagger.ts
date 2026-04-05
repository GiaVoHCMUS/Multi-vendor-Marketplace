import swaggerJsdoc from 'swagger-jsdoc';

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Marketplace API',
      version: '1.0.0',
      description: 'API documentation for Multi-vendor Marketplace',
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
      },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts'],
});
