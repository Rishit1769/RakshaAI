import { io, Socket } from 'socket.io-client';

// ─── Event types (mirrors backend) ─────────────────────────────────────────

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

export interface AlertStatusPayload {
  alertId: string;
  status: string;
  updatedBy: string;
  notes?: string;
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

// ─── Typed socket events ────────────────────────────────────────────────────

interface ServerToClientEvents {
  SOS_CREATED: (data: SosCreatedPayload) => void;
  LOCATION_UPDATE: (data: LocationUpdatePayload) => void;
  ALERT_STATUS_CHANGED: (data: AlertStatusPayload) => void;
  VOLUNTEER_ACCEPTED: (data: VolunteerAcceptedPayload) => void;
  POLICE_ACCEPTED: (data: AlertStatusPayload) => void;
  ALERT_RESOLVED: (data: AlertStatusPayload) => void;
}

interface ClientToServerEvents {
  JOIN_USER_ROOM: (userId: string) => void;
  JOIN_ALERT_ROOM: (alertId: string) => void;
  LEAVE_ALERT_ROOM: (alertId: string) => void;
  SEND_LOCATION: (data: {
    alertId: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
  }) => void;
}

// ─── Singleton socket instance ──────────────────────────────────────────────

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

const BACKEND_URL =
  process.env.NEXT_PUBLIC_WS_URL ??
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') ??
  'http://localhost:5000';

/**
 * Returns (and lazily creates) the singleton Socket.IO client.
 * Pass `token` to authenticate. Safe to call multiple times.
 */
export function getSocket(token?: string): AppSocket {
  if (socket?.connected) return socket;

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(BACKEND_URL, {
    auth: token ? { token } : undefined,
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  }) as AppSocket;

  socket.on('connect', () => {
    console.debug('[Socket] Connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.debug('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message);
  });

  return socket;
}

/** Disconnect and clear the singleton. */
export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
