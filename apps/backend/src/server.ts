import 'dotenv/config';
import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './config/database';
import { initializeSocket } from './sockets/index';

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const app = createApp();
  const httpServer = http.createServer(app);

  initializeSocket(httpServer);

  httpServer.listen(env.PORT, () => {
    logger.info(`Backend successfully initialized on port ${env.PORT}`);
    logger.info('Backend runtime configuration', {
      nodeEnv: env.NODE_ENV,
      corsOrigin: env.CORS_ORIGIN,
      apiBaseUrl: `http://localhost:${env.PORT}/api`,
    });
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received; shutting down gracefully`);
    httpServer.close(async () => {
      await disconnectDatabase();
      logger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Promise Rejection', { reason });
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
    process.exit(1);
  });
}

bootstrap().catch((err: unknown) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
