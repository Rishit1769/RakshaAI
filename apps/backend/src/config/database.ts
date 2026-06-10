import { prisma } from '../lib/prisma';
import { logger } from './logger';

export { prisma };

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  logger.info('✅ Database connected');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
