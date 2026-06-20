import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { prisma } from '../config/database';

// ─── Types ─────────────────────────────────────────────────────────────────

interface SocketUser {
  id: string;
  email: string;
  role: string;
}

interface SocketJwtPayload {
  sub: string;
  email: string;
  role: string;
}

interface AuthenticatedSocket extends Socket {
  user?: SocketUser;
}

// ─── Payload shapes ────────────────────────────────────────────────────────

export interface SosCreatedPayload {
  alertId: string;
  alertCode: string;
  userId: string;
  alertType: string;
  triggerMethod: string;
  latitude: number;
  longitude: number;
  address?: string;
  createdAt: string;
}

export interface LocationUpdatePayload {
  alertId: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
}

export interface VolunteerAcceptedPayload {
  alertId: string;
  volunteerId: string;
  volunteerName: string;
  etaSeconds?: number;
  latitude?: number;
  longitude?: number;
}

export interface AlertStatusPayload {
  alertId: string;
  status: string;
  updatedBy: string;
  notes?: string;
  timestamp: string;
}

// ─── Module state ──────────────────────────────────────────────────────────

let io: SocketIOServer | null = null;

// ─── Initialize ────────────────────────────────────────────────────────────

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

  // ── JWT Authentication Middleware ──────────────────────────────
  io.use((socket: AuthenticatedSocket, next) => {
    const token =
      (socket.handshake.auth as Record<string, string>)?.token ??
      (socket.handshake.headers?.authorization as string | undefined)?.replace('Bearer ', '');

    if (!token) {
      // Allow unauthenticated connections for public event feeds (read-only)
      return next();
    }

    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as SocketJwtPayload;
      socket.user = { id: payload.sub, email: payload.email, role: payload.role };
      next();
    } catch {
      next(new Error('Authentication failed: invalid token'));
    }
  });

  // ── Connection Handler ─────────────────────────────────────────
  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.user?.id ?? 'anonymous';
    logger.debug(`Socket connected: ${socket.id} (user: ${userId})`);

    // Auto-join personal room for authenticated users
    if (socket.user?.id) {
      void socket.join(`user:${socket.user.id}`);
    }

    // ── Room management ──────────────────────────────────────────

    socket.on('JOIN_USER_ROOM', (uid: string) => {
      // Only allow joining own room (unless admin)
      if (!socket.user || (socket.user.id !== uid && socket.user.role !== 'admin')) return;
      void socket.join(`user:${uid}`);
      logger.debug(`Socket ${socket.id} joined user room: ${uid}`);
    });

    socket.on('JOIN_ALERT_ROOM', (alertId: string) => {
      if (!socket.user) return;
      void socket.join(`alert:${alertId}`);
      logger.debug(`Socket ${socket.id} joined alert room: ${alertId}`);
    });

    socket.on('LEAVE_ALERT_ROOM', (alertId: string) => {
      void socket.leave(`alert:${alertId}`);
    });

    socket.on('JOIN_DEPARTMENT_ROOMS', (roomIds: string[]) => {
      if (!socket.user || socket.user.role !== 'POLICE_DEPARTMENT') return;
      roomIds
        .filter((roomId) => roomId.startsWith('department-zone:'))
        .forEach((roomId) => {
          void socket.join(roomId);
        });
    });

    socket.on('JOIN_NGO_ROOMS', (roomIds: string[]) => {
      if (!socket.user || socket.user.role !== 'NGO') return;
      roomIds
        .filter((roomId) => roomId.startsWith('ngo-zone:'))
        .forEach((roomId) => {
          void socket.join(roomId);
        });
    });

    socket.on('JOIN_OFFICER_ROOMS', (roomIds: string[]) => {
      if (!socket.user || socket.user.role !== 'POLICEMAN') return;
      roomIds
        .filter((roomId) => roomId.startsWith('officer-hotspot:'))
        .forEach((roomId) => {
          void socket.join(roomId);
        });
    });

    // ── Location updates from client ─────────────────────────────

    socket.on(
      'SEND_LOCATION',
      async (data: { alertId: string; latitude: number; longitude: number; accuracy?: number }) => {
        if (!socket.user) return;

        try {
          // Persist location to DB
          await prisma.userLocation.create({
            data: {
              userId: socket.user.id,
              latitude: data.latitude,
              longitude: data.longitude,
              accuracyMeters: data.accuracy !== undefined ? data.accuracy : undefined,
              alertId: data.alertId,
            },
          });

          // Broadcast to all subscribers of this alert
          const payload: LocationUpdatePayload = {
            alertId: data.alertId,
            userId: socket.user.id,
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: data.accuracy,
            timestamp: new Date().toISOString(),
          };

          getIO().to(`alert:${data.alertId}`).emit('LOCATION_UPDATE', payload);
        } catch (err) {
          logger.error('SEND_LOCATION handler error', { error: err });
        }
      }
    );

    // ── Presence ─────────────────────────────────────────────────

    socket.on('disconnect', (reason) => {
      logger.debug(`Socket disconnected: ${socket.id} (user: ${userId}) — ${reason}`);
    });

    socket.on('error', (err) => {
      logger.error('Socket error', { socketId: socket.id, error: err });
    });
  });

  logger.info('✅ Socket.IO initialized');
  return io;
}

// ─── Accessor ──────────────────────────────────────────────────────────────

export function getIO(): SocketIOServer {
  if (!io) throw new Error('Socket.IO not initialized — call initializeSocket() first');
  return io;
}

// ─── Typed Server Emitters ─────────────────────────────────────────────────

/** Broadcast SOS_CREATED to ALL connected responders (volunteers, police, admin) */
export function emitSOSCreated(payload: SosCreatedPayload): void {
  getIO().emit('SOS_CREATED', payload);
}

export function emitDepartmentScopedSOSCreated(
  roomIds: string[],
  payload: { alertId: string; latitude: number; longitude: number }
): void {
  roomIds.forEach((roomId) => {
    getIO().to(roomId).emit('SOS_CREATED', {
      alertId: payload.alertId,
      alertCode: payload.alertId.slice(0, 8).toUpperCase(),
      userId: roomId,
      alertType: 'general_danger',
      triggerMethod: 'tap',
      latitude: payload.latitude,
      longitude: payload.longitude,
      createdAt: new Date().toISOString(),
    });
  });
}

export function emitNgoScopedSOSCreated(
  roomIds: string[],
  payload: { alertId: string; latitude: number; longitude: number }
): void {
  roomIds.forEach((roomId) => {
    getIO().to(roomId).emit('SOS_CREATED', {
      alertId: payload.alertId,
      alertCode: payload.alertId.slice(0, 8).toUpperCase(),
      userId: roomId,
      alertType: 'general_danger',
      triggerMethod: 'tap',
      latitude: payload.latitude,
      longitude: payload.longitude,
      createdAt: new Date().toISOString(),
    });
  });
}

export function emitOfficerScopedSOSCreated(
  roomIds: string[],
  payload: { alertId: string; latitude: number; longitude: number }
): void {
  roomIds.forEach((roomId) => {
    getIO().to(roomId).emit('SOS_CREATED', {
      alertId: payload.alertId,
      alertCode: payload.alertId.slice(0, 8).toUpperCase(),
      userId: roomId,
      alertType: 'general_danger',
      triggerMethod: 'tap',
      latitude: payload.latitude,
      longitude: payload.longitude,
      createdAt: new Date().toISOString(),
    });
  });
}

/** Broadcast LOCATION_UPDATE to all subscribers of a specific alert room */
export function emitLocationUpdate(alertId: string, payload: LocationUpdatePayload): void {
  getIO().to(`alert:${alertId}`).emit('LOCATION_UPDATE', payload);
}

/** Notify alert room that a volunteer has accepted */
export function emitVolunteerAccepted(alertId: string, payload: VolunteerAcceptedPayload): void {
  getIO().to(`alert:${alertId}`).emit('VOLUNTEER_ACCEPTED', payload);
}

/** Notify alert room that police have accepted */
export function emitPoliceAccepted(alertId: string, payload: AlertStatusPayload): void {
  getIO().to(`alert:${alertId}`).emit('POLICE_ACCEPTED', payload);
}

/** Notify alert room that the alert has been resolved */
export function emitAlertResolved(alertId: string, payload: AlertStatusPayload): void {
  getIO().to(`alert:${alertId}`).emit('ALERT_RESOLVED', payload);
}

/** Notify alert room of any status change */
export function emitAlertStatusChanged(alertId: string, payload: AlertStatusPayload): void {
  getIO().to(`alert:${alertId}`).emit('ALERT_STATUS_CHANGED', payload);
  // Also notify the alert owner's personal room
  getIO().to(`user:${payload.updatedBy}`).emit('ALERT_STATUS_CHANGED', payload);
}
