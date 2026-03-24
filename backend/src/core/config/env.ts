import dotenv from 'dotenv';

dotenv.config();

export const env = {
  // Port
  PORT: process.env.PORT || 3000,
  APP_URL: process.env.APP_URL as string,
  APP_NAME: process.env.APP_NAME as string,

  // Database
  DATABASE_URL: process.env.DATABASE_URL as string,

  // Jwt
  JWT_SECRET: process.env.JWT_SECRET as string,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET as string,

  // Cloudinary
  CLOUDINARY_NAME: process.env.CLOUDINARY_NAME as string,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY as string,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET as string,

  // Mail
  SMTP_HOST: process.env.SMTP_HOST as string,
  SMTP_USERNAME: process.env.SMTP_USERNAME as string,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD as string,
  SMTP_PORT: Number(process.env.SMTP_PORT),
  SMTP_SECURE: process.env.SMTP_SECURE as string,
  SMTP_FROM: process.env.SMTP_FROM as string,
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME as string,

  // Redis Config
  REDIS_HOST: process.env.REDIS_HOST as string,
  REDIS_PORT: Number(process.env.REDIS_PORT),
};
