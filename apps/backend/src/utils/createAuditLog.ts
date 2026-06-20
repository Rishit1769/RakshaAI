import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma } from '../config/database';

type AuditLogDb = Pick<PrismaClient, 'auditLog' | 'user'> | Pick<Prisma.TransactionClient, 'auditLog' | 'user'>;

export async function createAuditLog(
  actorId: string | null,
  action: string,
  targetId?: string | null,
  details?: Prisma.InputJsonValue,
  entityType?: string,
  db: AuditLogDb = prisma
) {
  const actor = actorId
    ? await db.user.findUnique({
        where: { id: actorId },
        select: { role: true },
      })
    : null;

  return db.auditLog.create({
    data: {
      actorId,
      actorRole: actor?.role ?? null,
      action,
      entityType: entityType ?? null,
      entityId: targetId ?? null,
      metadata: details ?? undefined,
    },
  });
}
