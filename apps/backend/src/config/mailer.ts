import nodemailer from 'nodemailer';
import { env } from './env';
import { logger } from './logger';

export const emailTransporter = nodemailer.createTransport({
  host: env.EMAIL_HOST,
  port: env.EMAIL_PORT,
  secure: env.EMAIL_SECURE,
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASS,
  },
});

export async function verifyEmailTransporter(): Promise<void> {
  if (!env.EMAIL_HOST || !env.EMAIL_USER || !env.EMAIL_PASS) {
    logger.warn('Email transporter not configured - email features disabled');
    return;
  }

  try {
    await emailTransporter.verify();
    logger.info('Email transporter ready');
  } catch (error) {
    logger.warn('Email transporter verification failed - email features disabled', { error });
  }
}
