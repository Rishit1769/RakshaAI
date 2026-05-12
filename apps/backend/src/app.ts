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

  // ─── Security headers ──────────────────────────────────────────
  app.use(helmet());

  // ─── CORS ─────────────────────────────────────────────────────
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // ─── Body parsing ─────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // ─── Input sanitization ──────────────────────────────────────
  app.use(sanitizeBody);

  // ─── Compression ──────────────────────────────────────────────
  app.use(compression());

  // ─── HTTP request logging ──────────────────────────────────────
  const morganFormat = env.NODE_ENV === 'production' ? 'combined' : 'dev';
  app.use(
    morgan(morganFormat, {
      stream: { write: (message) => logger.http(message.trim()) },
    })
  );

  // ─── Global rate limiting ─────────────────────────────────────
  app.use('/api', rateLimiter);

  // ─── API routes ───────────────────────────────────────────────
  app.use('/api', apiRouter);

  // ─── 404 handler ──────────────────────────────────────────────
  app.use(notFoundHandler);

  // ─── Global error handler (must be last) ──────────────────────
  app.use(errorHandler);

  return app;
}
