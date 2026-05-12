import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { env } from '../config/env';
import { logger } from '../config/logger';

let io: SocketIOServer | null = null;

export function initializeSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  io.on('connection', (socket: Socket) => {
    logger.debug(`Socket connected: ${socket.id}`);

    // Client joins a personal room by their user ID for targeted notifications
    socket.on('JOIN_USER_ROOM', (userId: string) => {
      void socket.join(`user:${userId}`);
      logger.debug(`Socket ${socket.id} joined room user:${userId}`);
    });

    // Client joins an alert room to receive live updates for a specific SOS
    socket.on('JOIN_ALERT_ROOM', (alertId: string) => {
      void socket.join(`alert:${alertId}`);
      logger.debug(`Socket ${socket.id} joined room alert:${alertId}`);
    });

    socket.on('LEAVE_ALERT_ROOM', (alertId: string) => {
      void socket.leave(`alert:${alertId}`);
    });

    socket.on('disconnect', (reason) => {
      logger.debug(`Socket disconnected: ${socket.id} — reason: ${reason}`);
    });

    socket.on('error', (err) => {
      logger.error('Socket error', { socketId: socket.id, error: err });
    });
  });

  logger.info('✅ Socket.IO initialized');
  return io;
}

/** Returns the Socket.IO server instance (after initialization). */
export function getIO(): SocketIOServer {
  if (!io) throw new Error('Socket.IO not initialized — call initializeSocket() first');
  return io;
}

// ─── Typed Emitter Helpers ─────────────────────────────────────────────────

/** Emit SOS_CREATED to the responder broadcast channel */
export function emitSOSCreated(payload: unknown): void {
  getIO().emit('SOS_CREATED', payload);
}

/** Emit LOCATION_UPDATE to all subscribers of a specific alert room */
export function emitLocationUpdate(alertId: string, payload: unknown): void {
  getIO().to(`alert:${alertId}`).emit('LOCATION_UPDATE', payload);
}

/** Emit VOLUNTEER_ACCEPTED to the alert room */
export function emitVolunteerAccepted(alertId: string, payload: unknown): void {
  getIO().to(`alert:${alertId}`).emit('VOLUNTEER_ACCEPTED', payload);
}

/** Emit POLICE_ACCEPTED to the alert room */
export function emitPoliceAccepted(alertId: string, payload: unknown): void {
  getIO().to(`alert:${alertId}`).emit('POLICE_ACCEPTED', payload);
}

/** Emit ALERT_RESOLVED to the alert room */
export function emitAlertResolved(alertId: string, payload: unknown): void {
  getIO().to(`alert:${alertId}`).emit('ALERT_RESOLVED', payload);
}
