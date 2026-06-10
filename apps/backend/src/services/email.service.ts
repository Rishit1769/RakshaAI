import { emailTransporter } from '../config/mailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

interface SendEmergencyEmailOptions {
  to: string;
  contactName: string;
  userName: string;
  alertCode: string;
  latitude: number;
  longitude: number;
  message?: string;
}

export async function sendEmergencyEmail(options: SendEmergencyEmailOptions): Promise<void> {
  const { to, contactName, userName, alertCode, latitude, longitude, message } = options;
  const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;

  try {
    await emailTransporter.sendMail({
      from: env.SMTP_FROM,
      to,
      subject: `Emergency alert ${alertCode}`,
      html: `
        <p>Dear ${contactName},</p>
        <p>${userName} triggered an emergency alert.</p>
        <p><strong>Alert Code:</strong> ${alertCode}</p>
        <p><strong>Location:</strong> <a href="${mapsLink}">${latitude}, ${longitude}</a></p>
        ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
      `,
    });
  } catch (error) {
    logger.warn('Emergency email delivery failed', { to, alertCode, error });
  }
}
