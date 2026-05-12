import nodemailer from 'nodemailer';
import { env } from './env';
import { logger } from './logger';

export const emailTransporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export async function verifyEmailTransporter(): Promise<void> {
  try {
    await emailTransporter.verify();
    logger.info('✅ Email transporter ready');
  } catch (error) {
    logger.warn('Email transporter not configured — email features disabled', { error });
  }
}
