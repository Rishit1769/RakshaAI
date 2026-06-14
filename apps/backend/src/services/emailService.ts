import { emailTransporter } from '../config/mailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

export interface SOSUserInfo {
  fullName: string;
  phone: string;
  email?: string | null;
  triggeredAt?: Date;
  alertId?: string;
}

export interface SOSEmergencyContact {
  id?: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface SOSLocationPayload {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  source?: 'live' | 'last_known';
}

export interface WelcomeEmailPayload {
  fullName: string;
  email: string;
  password: string;
  role: string;
  departmentName?: string | null;
}

export interface RedZoneEmailPayload {
  departmentName: string;
  departmentEmail: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  latitude: number;
  longitude: number;
  triggeredAt?: Date;
  triggeredBy?: {
    fullName: string;
    phone?: string | null;
    email?: string | null;
  } | null;
}

export async function sendSOSAlert(
  userInfo: SOSUserInfo,
  emergencyContacts: SOSEmergencyContact[],
  location?: SOSLocationPayload | null
): Promise<void> {
  const emailContacts = emergencyContacts.filter((contact) => Boolean(contact.email));

  if (!emailContacts.length) {
    logger.warn('SOS email skipped because no emergency contacts have email addresses', {
      alertId: userInfo.alertId,
    });
    return;
  }

  await Promise.all(
    emailContacts.map(async (contact) => {
      try {
        await emailTransporter.sendMail({
          from: env.EMAIL_FROM,
          to: contact.email!,
          subject: `🚨 SOS ALERT – ${userInfo.fullName} needs immediate help!`,
          html: buildSosAlertHtml(userInfo, contact, location),
        });

        logger.info('SOS email delivered', {
          alertId: userInfo.alertId,
          contactId: contact.id,
          contactEmail: contact.email,
          status: 'sent',
        });
      } catch (error) {
        logger.error('SOS email delivery failed', {
          alertId: userInfo.alertId,
          contactId: contact.id,
          contactEmail: contact.email,
          status: 'failed',
          error,
        });
      }
    })
  );
}

export async function sendWelcomeEmail(payload: WelcomeEmailPayload): Promise<void> {
  try {
    await emailTransporter.sendMail({
      from: env.EMAIL_FROM,
      to: payload.email,
      subject: `Welcome to RakshaAI - ${payload.role} account created`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#111827;line-height:1.6;">
          <h1 style="color:#0f172a;">Welcome to RakshaAI</h1>
          <p>Hello ${payload.fullName}, your RakshaAI account has been created.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:10px;font-weight:700;background:#e2e8f0;">Role</td><td style="padding:10px;">${payload.role}</td></tr>
            <tr><td style="padding:10px;font-weight:700;background:#e2e8f0;">Email</td><td style="padding:10px;">${payload.email}</td></tr>
            <tr><td style="padding:10px;font-weight:700;background:#e2e8f0;">Password</td><td style="padding:10px;">${payload.password}</td></tr>
            <tr><td style="padding:10px;font-weight:700;background:#e2e8f0;">Department</td><td style="padding:10px;">${payload.departmentName ?? 'Not assigned'}</td></tr>
          </table>
          <p>Please sign in and change your password after your first login.</p>
        </div>
      `,
    });
  } catch (error) {
    logger.error('Welcome email delivery failed', { email: payload.email, error });
  }
}

export async function sendRedZoneAlertEmails(payloads: RedZoneEmailPayload[]): Promise<void> {
  await Promise.all(
    payloads.map(async (payload) => {
      try {
        await emailTransporter.sendMail({
          from: env.EMAIL_FROM,
          to: payload.departmentEmail,
          subject: '🔴 RED ZONE ALERT in your vicinity – Immediate Attention Required',
          html: buildRedZoneEmailHtml(payload),
        });

        logger.info('Red zone email delivered', {
          departmentEmail: payload.departmentEmail,
          departmentName: payload.departmentName,
          severity: payload.severity,
          status: 'sent',
        });
      } catch (error) {
        logger.error('Red zone email delivery failed', {
          departmentEmail: payload.departmentEmail,
          departmentName: payload.departmentName,
          severity: payload.severity,
          status: 'failed',
          error,
        });
      }
    })
  );
}

function buildSosAlertHtml(
  userInfo: SOSUserInfo,
  contact: SOSEmergencyContact,
  location?: SOSLocationPayload | null
): string {
  const triggeredAt = userInfo.triggeredAt ?? new Date();
  const formattedTime = formatIstTimestamp(triggeredAt);
  const hasCoordinates =
    typeof location?.latitude === 'number' && typeof location?.longitude === 'number';
  const coordinatesText = hasCoordinates
    ? `Lat: ${location.latitude!.toFixed(4)}, Long: ${location.longitude!.toFixed(4)}`
    : 'Location unavailable';
  const mapsLink = hasCoordinates
    ? `https://www.google.com/maps?q=${location!.latitude},${location!.longitude}`
    : null;
  const accuracyText =
    typeof location?.accuracy === 'number' ? `± ${Math.round(location.accuracy)} meters` : null;
  const staticMapUrl = getStaticMapUrl(location);

  return `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;color:#111827;line-height:1.6;">
      <div style="background:#991b1b;color:#ffffff;padding:20px 24px;border-radius:16px 16px 0 0;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">Raksha AI Emergency Alert</p>
        <h1 style="margin:0;font-size:28px;">${userInfo.fullName} needs immediate help</h1>
      </div>
      <div style="border:1px solid #fecaca;border-top:none;border-radius:0 0 16px 16px;padding:24px;background:#fff7f7;">
        <p style="margin-top:0;">Hello ${contact.name}, an SOS was triggered from Raksha AI.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr><td style="padding:12px;font-weight:700;background:#fee2e2;width:180px;">User</td><td style="padding:12px;">${userInfo.fullName}</td></tr>
          <tr><td style="padding:12px;font-weight:700;background:#fee2e2;">Phone Number</td><td style="padding:12px;">${userInfo.phone}</td></tr>
          <tr><td style="padding:12px;font-weight:700;background:#fee2e2;">Triggered At (IST)</td><td style="padding:12px;">${formattedTime}</td></tr>
          <tr><td style="padding:12px;font-weight:700;background:#fee2e2;">Coordinates</td><td style="padding:12px;">${coordinatesText}</td></tr>
          <tr><td style="padding:12px;font-weight:700;background:#fee2e2;">Map Link</td><td style="padding:12px;">${mapsLink ? `<a href="${mapsLink}" target="_blank" rel="noopener noreferrer">Open in Google Maps</a>` : 'Location unavailable'}</td></tr>
          <tr><td style="padding:12px;font-weight:700;background:#fee2e2;">Accuracy</td><td style="padding:12px;">${accuracyText ?? 'Unavailable'}</td></tr>
        </table>
        ${staticMapUrl ? `<img src="${staticMapUrl}" alt="SOS location map preview" style="display:block;width:100%;max-width:600px;height:auto;border-radius:12px;border:1px solid #fecaca;margin:20px 0;" />` : ''}
        <p style="margin:20px 0 0;font-size:18px;font-weight:700;color:#991b1b;">
          Please contact ${userInfo.fullName} immediately and take urgent action right away.
        </p>
      </div>
    </div>
  `;
}

function buildRedZoneEmailHtml(payload: RedZoneEmailPayload): string {
  const severityColor =
    payload.severity === 'high' ? '#dc2626' : payload.severity === 'medium' ? '#ea580c' : '#ca8a04';
  const mapsLink = `https://www.google.com/maps?q=${payload.latitude},${payload.longitude}`;
  const staticMapUrl = getStaticMapUrl({
    latitude: payload.latitude,
    longitude: payload.longitude,
  });
  const reporterText = payload.triggeredBy
    ? `${payload.triggeredBy.fullName}${payload.triggeredBy.phone ? ` (${payload.triggeredBy.phone})` : ''}${payload.triggeredBy.email ? ` - ${payload.triggeredBy.email}` : ''}`
    : 'Anonymous trigger';

  return `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;color:#111827;line-height:1.6;">
      <div style="background:${severityColor};color:#ffffff;padding:20px 24px;border-radius:16px 16px 0 0;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">Raksha AI Red Zone Alert</p>
        <h1 style="margin:0;font-size:28px;">Immediate Attention Required</h1>
      </div>
      <div style="border:1px solid #fecaca;border-top:none;border-radius:0 0 16px 16px;padding:24px;background:#fffaf7;">
        <p>Hello ${payload.departmentName}, a red zone has been triggered near one of your department safe zones.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr><td style="padding:12px;font-weight:700;background:#fee2e2;width:180px;">Severity</td><td style="padding:12px;color:${severityColor};font-weight:700;text-transform:uppercase;">${payload.severity}</td></tr>
          <tr><td style="padding:12px;font-weight:700;background:#fee2e2;">Triggered At (IST)</td><td style="padding:12px;">${formatIstTimestamp(payload.triggeredAt ?? new Date())}</td></tr>
          <tr><td style="padding:12px;font-weight:700;background:#fee2e2;">Coordinates</td><td style="padding:12px;">Lat: ${payload.latitude.toFixed(4)}, Long: ${payload.longitude.toFixed(4)}</td></tr>
          <tr><td style="padding:12px;font-weight:700;background:#fee2e2;">Map Link</td><td style="padding:12px;"><a href="${mapsLink}" target="_blank" rel="noopener noreferrer">Open in Google Maps</a></td></tr>
          <tr><td style="padding:12px;font-weight:700;background:#fee2e2;">Description</td><td style="padding:12px;">${payload.description}</td></tr>
          <tr><td style="padding:12px;font-weight:700;background:#fee2e2;">Triggered By</td><td style="padding:12px;">${reporterText}</td></tr>
        </table>
        ${staticMapUrl ? `<img src="${staticMapUrl}" alt="Red zone map preview" style="display:block;width:100%;max-width:600px;height:auto;border-radius:12px;border:1px solid #fecaca;margin:20px 0;" />` : ''}
      </div>
    </div>
  `;
}

function formatIstTimestamp(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'long',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

function getStaticMapUrl(location?: { latitude?: number; longitude?: number } | null): string | null {
  if (!env.GOOGLE_MAPS_API_KEY) return null;
  if (typeof location?.latitude !== 'number' || typeof location?.longitude !== 'number') return null;

  return `https://maps.googleapis.com/maps/api/staticmap?center=${location.latitude},${location.longitude}&zoom=15&size=600x300&markers=${location.latitude},${location.longitude}&key=${env.GOOGLE_MAPS_API_KEY}`;
}
