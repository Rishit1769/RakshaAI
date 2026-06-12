import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { env } from './config/env';
import { logger } from './config/logger';
import { rateLimiter } from './middleware/rateLimiter.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { sanitizeBody } from './utils/sanitize';
import apiRouter from './routes/index';

export function createApp(): Application {
  const app = express();
  const allowedOrigins = env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(helmet());

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        logger.error('Blocked CORS request', { origin, allowedOrigins });
        callback(new Error(`CORS origin not allowed: ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  logger.info('CORS configured', { allowedOrigins, credentials: true });

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.use(sanitizeBody);
  app.use(compression());

  const morganFormat = env.NODE_ENV === 'production' ? 'combined' : 'dev';
  app.use(
    morgan(morganFormat, {
      stream: { write: (message) => logger.http(message.trim()) },
    })
  );

  app.use('/api', rateLimiter);
  app.use('/api', apiRouter);

  logger.info('API routes mounted', {
    auth: '/api/auth',
    volunteers: '/api/volunteers',
    police: '/api/police',
    health: '/api/health',
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
