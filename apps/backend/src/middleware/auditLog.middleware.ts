import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';

type AuditAction =
  | 'AUTH_LOGIN'
  | 'AUTH_REGISTER'
  | 'AUTH_LOGOUT'
  | 'AUTH_REFRESH'
  | 'SOS_CREATED'
  | 'SOS_STATUS_CHANGED'
  | 'VOLUNTEER_ACCEPTED_ALERT'
  | 'POLICE_ASSIGNED_ALERT'
  | 'ALERT_ESCALATED'
  | 'COMMUNITY_REPORT_CREATED'
  | 'AI_CHAT'
  | 'AI_CLASSIFY';

interface AuditOptions {
  action: AuditAction;
  /** Extract resource ID from the response body or route. Defaults to undefined. */
  resourceIdFromBody?: string;
}

/**
 * Middleware factory to log sensitive operations into audit_logs table (if it exists).
 * Silently skips if the table is unavailable.
 */
export function auditLog(opts: AuditOptions) {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    // Fire-and-forget audit after response. We wrap in try-catch to never block the request.
    const originalJson = _res.json.bind(_res);

    _res.json = function (body: unknown) {
      const result = originalJson(body);

      void (async () => {
        try {
          // Use $queryRaw so the audit log never throws if the table is missing
          const userId = _req.user?.id ?? null;
          const ipAddress = (_req.ip ?? '').replace('::ffff:', '');
          const userAgent = _req.get('user-agent') ?? null;
          const resourceId =
            opts.resourceIdFromBody
              ? (body as Record<string, Record<string, string>>)?.data?.[opts.resourceIdFromBody] ?? null
              : null;

          await prisma.$executeRawUnsafe(
            `INSERT INTO audit_logs (user_id, action, resource_id, ip_address, user_agent, created_at)
             VALUES ($1::uuid, $2, $3::uuid, $4, $5, now())
             ON CONFLICT DO NOTHING`,
            userId,
            opts.action,
            resourceId,
            ipAddress,
            userAgent
          );
        } catch {
          // Audit log failures must never break the API
        }
      })();

      return result;
    };

    next();
  };
}
