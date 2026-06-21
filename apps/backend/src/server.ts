process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
  process.exit(1);
});

import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './config/database';
import { initializeSocket } from './sockets/index';

const SERVER_HOST = process.env.HOST ?? '0.0.0.0';

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const app = createApp();
  const httpServer = http.createServer(app);

  initializeSocket(httpServer);

  httpServer.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port already in use: ${env.PORT}`);
      return;
    }

    console.error('HTTP server error:', error);
  });

  httpServer.listen(env.PORT, SERVER_HOST, () => {
    console.log(`✅ Backend running on ${SERVER_HOST}:${env.PORT}`);
    console.log(`✅ Environment: ${env.NODE_ENV}`);
    console.log(`✅ Database URL defined: ${Boolean(process.env.DATABASE_URL)}`);
    logger.info(`Backend successfully initialized on ${SERVER_HOST}:${env.PORT}`);
    logger.info('Backend runtime configuration', {
      nodeEnv: env.NODE_ENV,
      corsOrigin: env.CORS_ORIGIN,
      host: SERVER_HOST,
      apiBaseUrl: `http://${SERVER_HOST}:${env.PORT}/api`,
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
}

bootstrap().catch((err: unknown) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
