import { emailTransporter } from '../config/mailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

interface SendOTPOptions {
  to: string;
  name: string;
  otp: string;
  purpose: 'register' | 'login' | 'reset' | 'verify' | 'mpin';
}

const PURPOSE_LABELS: Record<SendOTPOptions['purpose'], string> = {
  register: 'Account Verification',
  login: 'Login Verification',
  reset: 'Password Reset',
  verify: 'Identity Verification',
  mpin: 'MPIN Verification',
};

/**
 * Sends an OTP email using Nodemailer.
 */
export async function sendOTPEmail(options: SendOTPOptions): Promise<void> {
  const { to, name, otp, purpose } = options;
  const label = PURPOSE_LABELS[purpose];

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: 'Inter', Arial, sans-serif; background: #F7F8FC; margin: 0; padding: 0; }
    .container { max-width: 520px; margin: 40px auto; background: #ffffff; border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden; }
    .header { background: linear-gradient(135deg, #FF6B2D, #D72638); padding: 32px;
      text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; letter-spacing: 1px; }
    .header p { color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 13px; }
    .body { padding: 36px 40px; }
    .greeting { font-size: 16px; color: #0B1026; margin-bottom: 12px; }
    .purpose { font-size: 14px; color: #7E8794; margin-bottom: 24px; }
    .otp-box { background: #F7F8FC; border: 2px dashed #FF6B2D; border-radius: 10px;
      text-align: center; padding: 20px; margin-bottom: 24px; }
    .otp-code { font-size: 40px; font-weight: 700; letter-spacing: 10px; color: #D72638;
      font-family: 'Courier New', monospace; }
    .expiry { font-size: 13px; color: #7E8794; text-align: center; margin-bottom: 24px; }
    .warning { font-size: 12px; color: #FFB020; background: #FFF8E6; border-radius: 6px;
      padding: 10px 14px; margin-bottom: 16px; }
    .footer { text-align: center; font-size: 11px; color: #7E8794; padding: 20px; 
      border-top: 1px solid #E5E7EB; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ RakshaAI</h1>
      <p>AI-Powered Women Safety Platform</p>
    </div>
    <div class="body">
      <p class="greeting">Hello ${name},</p>
      <p class="purpose">Your <strong>${label}</strong> OTP code is:</p>
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
      </div>
      <p class="expiry">⏱️ This code expires in <strong>10 minutes</strong>.</p>
      <div class="warning">
        ⚠️ Do NOT share this OTP with anyone. RakshaAI will never ask for your OTP.
      </div>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} RakshaAI — Your safety is our priority.
    </div>
  </div>
</body>
</html>`;

  try {
    await emailTransporter.sendMail({
      from: env.SMTP_FROM,
      to,
      subject: `${otp} — RakshaAI ${label} OTP`,
      html,
    });
    logger.info('OTP email sent', { to, purpose });
  } catch (error) {
    logger.error('Failed to send OTP email', { to, purpose, error });
    throw new Error('Failed to send verification email. Please try again.');
  }
}

/**
 * Sends an emergency alert email to a guardian/emergency contact.
 */
export async function sendEmergencyEmail(options: {
  to: string;
  contactName: string;
  userName: string;
  alertCode: string;
  latitude: number;
  longitude: number;
  message?: string;
}): Promise<void> {
  const { to, contactName, userName, alertCode, latitude, longitude, message } = options;
  const mapsLink = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=16`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #F7F8FC; margin: 0; padding: 0; }
    .container { max-width: 520px; margin: 40px auto; background: #fff; border-radius: 12px;
      border: 2px solid #D72638; overflow: hidden; }
    .header { background: #D72638; padding: 24px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; }
    .body { padding: 28px 32px; }
    .alert-box { background: #FFF0F0; border: 1px solid #D72638; border-radius: 8px;
      padding: 16px; margin-bottom: 20px; }
    .alert-code { font-size: 12px; color: #7E8794; font-family: monospace; }
    .location-link { display: inline-block; background: #D72638; color: #fff;
      padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }
    .footer { text-align: center; font-size: 11px; color: #7E8794; padding: 16px;
      border-top: 1px solid #E5E7EB; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 EMERGENCY ALERT — RakshaAI</h1>
    </div>
    <div class="body">
      <p>Dear <strong>${contactName}</strong>,</p>
      <div class="alert-box">
        <p><strong>${userName}</strong> has triggered an emergency SOS alert.</p>
        ${message ? `<p>Message: <em>${message}</em></p>` : ''}
        <p class="alert-code">Alert Code: ${alertCode}</p>
      </div>
      <p>Last known location:</p>
      <p><a href="${mapsLink}" class="location-link">📍 View on Map</a></p>
      <p style="font-size:12px;color:#7E8794;margin-top:12px;">
        Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}
      </p>
      <p>Please check on them immediately or contact local authorities.</p>
    </div>
    <div class="footer">© ${new Date().getFullYear()} RakshaAI — Protecting Lives</div>
  </div>
</body>
</html>`;

  try {
    await emailTransporter.sendMail({
      from: env.SMTP_FROM,
      to,
      subject: `🚨 EMERGENCY: ${userName} needs help — RakshaAI Alert ${alertCode}`,
      html,
    });
    logger.info('Emergency email sent', { to, alertCode });
  } catch (error) {
    logger.error('Failed to send emergency email', { to, alertCode, error });
    // Don't throw — email failure must not block SOS pipeline
  }
}
