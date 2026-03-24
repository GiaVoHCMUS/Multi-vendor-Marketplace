import nodemailer from 'nodemailer';
import ejs from 'ejs';
import path from 'node:path';
import { env } from '@/core/config/env';
import { AppError } from '../utils/AppError';

export const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE === 'ssl', // Use true for port 465, false for port 587
  auth: {
    user: env.SMTP_USERNAME,
    pass: env.SMTP_PASSWORD,
  },
});

// Template folder
const TEMPLATE_DIR = path.resolve('src/views/emails');

export type MailTemplateOptions = Record<string, unknown>;

export const mailService = {
  // Gửi HTML raw
  async sendMail(to: string, subject: string, message: string) {
    try {
      const info = await transporter.sendMail({
        from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM}>`,
        to,
        subject,
        html: message, // HTML version of the message
      });

      return info;
    } catch (error) {
      throw new AppError('Gửi email không thành công', 500, error);
    }
  },

  // Gửi mail kết hợp với EJS template
  async sendWithTemplate(
    to: string,
    subject: string,
    templateName: string,
    options: MailTemplateOptions = {},
  ) {
    try {
      const layoutPath = path.join(
        TEMPLATE_DIR,
        'layouts',
        'email-layouts.ejs',
      );
      const templatePath = path.join(TEMPLATE_DIR, `${templateName}.ejs`);

      const content = await ejs.renderFile(templatePath, {
        ...options,
        appUrl: env.APP_URL,
        appName: env.APP_NAME,
      });

      const html = await ejs.renderFile(layoutPath, {
        body: content,
        subject,
        appUrl: env.APP_URL,
        appName: env.APP_NAME,
      });
      
      return this.sendMail(to, subject, html);
    } catch (error) {
      throw new AppError('Gửi email với mẫu không thành công', 500, error);
    }
  },
};
