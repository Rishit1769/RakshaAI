import 'dotenv/config';
import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './config/database';
import { initializeSocket } from './sockets/index';

async function bootstrap(): Promise<void> {
  // 1. Connect to database
  await connectDatabase();

  // 2. Create Express app
  const app = createApp();

  // 3. Create HTTP server (required for Socket.IO)
  const httpServer = http.createServer(app);

  // 4. Initialize Socket.IO
  initializeSocket(httpServer);

  // 5. Start listening
  httpServer.listen(env.PORT, () => {
    logger.info(`🚀 RakshaAI backend running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  // ─── Graceful shutdown ────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received — shutting down gracefully`);
    httpServer.close(async () => {
      await disconnectDatabase();
      logger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.on('SIGINT',  () => { void shutdown('SIGINT'); });

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
