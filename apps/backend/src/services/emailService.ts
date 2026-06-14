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

function buildSosAlertHtml(
  userInfo: SOSUserInfo,
  contact: SOSEmergencyContact,
  location?: SOSLocationPayload | null
): string {
  const triggeredAt = userInfo.triggeredAt ?? new Date();
  const formattedTime = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'long',
    timeZone: 'Asia/Kolkata',
  }).format(triggeredAt);

  const hasCoordinates =
    typeof location?.latitude === 'number' && typeof location?.longitude === 'number';

  const coordinatesText = hasCoordinates
    ? `Lat: ${location!.latitude!.toFixed(4)}, Long: ${location!.longitude!.toFixed(4)}`
    : 'Location unavailable';
  const mapsLink = hasCoordinates
    ? `https://www.google.com/maps?q=${location!.latitude},${location!.longitude}`
    : null;
  const accuracyText =
    typeof location?.accuracy === 'number' ? `± ${Math.round(location.accuracy)} meters` : null;
  const staticMapUrl =
    hasCoordinates && env.GOOGLE_MAPS_API_KEY
      ? `https://maps.googleapis.com/maps/api/staticmap?center=${location!.latitude},${location!.longitude}&zoom=15&size=600x300&markers=${location!.latitude},${location!.longitude}&key=${env.GOOGLE_MAPS_API_KEY}`
      : null;

  return `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;color:#111827;line-height:1.6;">
      <div style="background:#991b1b;color:#ffffff;padding:20px 24px;border-radius:16px 16px 0 0;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">Raksha AI Emergency Alert</p>
        <h1 style="margin:0;font-size:28px;">${userInfo.fullName} needs immediate help</h1>
      </div>
      <div style="border:1px solid #fecaca;border-top:none;border-radius:0 0 16px 16px;padding:24px;background:#fff7f7;">
        <p style="margin-top:0;">Hello ${contact.name}, an SOS was triggered from Raksha AI.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:12px;font-weight:700;background:#fee2e2;width:180px;">User</td>
            <td style="padding:12px;">${userInfo.fullName}</td>
          </tr>
          <tr>
            <td style="padding:12px;font-weight:700;background:#fee2e2;">Phone Number</td>
            <td style="padding:12px;">${userInfo.phone}</td>
          </tr>
          <tr>
            <td style="padding:12px;font-weight:700;background:#fee2e2;">Triggered At (IST)</td>
            <td style="padding:12px;">${formattedTime}</td>
          </tr>
          <tr>
            <td style="padding:12px;font-weight:700;background:#fee2e2;">Coordinates</td>
            <td style="padding:12px;">${coordinatesText}</td>
          </tr>
          <tr>
            <td style="padding:12px;font-weight:700;background:#fee2e2;">Map Link</td>
            <td style="padding:12px;">${mapsLink ? `<a href="${mapsLink}" target="_blank" rel="noopener noreferrer">https://www.google.com/maps?q=${location!.latitude},${location!.longitude}</a>` : 'Location unavailable'}</td>
          </tr>
          <tr>
            <td style="padding:12px;font-weight:700;background:#fee2e2;">Accuracy</td>
            <td style="padding:12px;">${accuracyText ?? 'Unavailable'}</td>
          </tr>
        </table>
        ${staticMapUrl ? `<img src="${staticMapUrl}" alt="SOS location map preview" style="display:block;width:100%;max-width:600px;height:auto;border-radius:12px;border:1px solid #fecaca;margin:20px 0;" />` : ''}
        <p style="margin:20px 0 0;font-size:18px;font-weight:700;color:#991b1b;">
          Please contact ${userInfo.fullName} immediately and take urgent action right away.
        </p>
      </div>
    </div>
  `;
}
