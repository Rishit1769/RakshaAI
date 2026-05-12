'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth.store';
import type {
  AlertStatusPayload,
  LocationUpdatePayload,
  VolunteerAcceptedPayload,
} from '@/lib/socket';

export interface SosRealtimeState {
  /** Latest alert status from socket */
  status: string | null;
  /** Latest location broadcast for this alert */
  latestLocation: LocationUpdatePayload | null;
  /** Volunteer acceptance payload */
  volunteerInfo: VolunteerAcceptedPayload | null;
  /** Whether the alert has been resolved */
  isResolved: boolean;
  /** Whether the alert has been cancelled */
  isCancelled: boolean;
}

/**
 * Subscribes to real-time Socket.IO events for a specific SOS alert.
 * Joins/leaves the alert room automatically on mount/unmount.
 *
 * @param alertId - The alert ID to subscribe to (or null to skip)
 */
export function useSosRealtime(alertId: string | null): SosRealtimeState {
  const { tokens } = useAuthStore();

  const [state, setState] = useState<SosRealtimeState>({
    status: null,
    latestLocation: null,
    volunteerInfo: null,
    isResolved: false,
    isCancelled: false,
  });

  const handleStatusChange = useCallback((data: AlertStatusPayload) => {
    if (alertId && data.alertId !== alertId) return;
    setState((prev) => ({
      ...prev,
      status: data.status,
      isResolved: data.status === 'resolved',
      isCancelled: data.status === 'cancelled',
    }));
  }, [alertId]);

  const handleLocationUpdate = useCallback((data: LocationUpdatePayload) => {
    if (alertId && data.alertId !== alertId) return;
    setState((prev) => ({ ...prev, latestLocation: data }));
  }, [alertId]);

  const handleVolunteerAccepted = useCallback((data: VolunteerAcceptedPayload) => {
    if (alertId && data.alertId !== alertId) return;
    setState((prev) => ({
      ...prev,
      volunteerInfo: data,
      status: prev.status ?? 'accepted',
    }));
  }, [alertId]);

  const handleResolved = useCallback((data: AlertStatusPayload) => {
    if (alertId && data.alertId !== alertId) return;
    setState((prev) => ({ ...prev, status: 'resolved', isResolved: true }));
  }, [alertId]);

  useEffect(() => {
    if (!alertId) return;

    const socket = getSocket(tokens?.accessToken);

    // Join the alert's realtime room
    socket.emit('JOIN_ALERT_ROOM', alertId);

    socket.on('ALERT_STATUS_CHANGED', handleStatusChange);
    socket.on('LOCATION_UPDATE', handleLocationUpdate);
    socket.on('VOLUNTEER_ACCEPTED', handleVolunteerAccepted);
    socket.on('ALERT_RESOLVED', handleResolved);

    return () => {
      socket.emit('LEAVE_ALERT_ROOM', alertId);
      socket.off('ALERT_STATUS_CHANGED', handleStatusChange);
      socket.off('LOCATION_UPDATE', handleLocationUpdate);
      socket.off('VOLUNTEER_ACCEPTED', handleVolunteerAccepted);
      socket.off('ALERT_RESOLVED', handleResolved);
    };
  }, [alertId, tokens?.accessToken, handleStatusChange, handleLocationUpdate, handleVolunteerAccepted, handleResolved]);

  return state;
}
