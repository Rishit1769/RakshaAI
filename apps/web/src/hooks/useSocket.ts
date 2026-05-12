'use client';

import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth.store';

/**
 * Manages the Socket.IO connection lifecycle for the authenticated user.
 * - Connects on mount when the user is authenticated.
 * - Joins the personal user room automatically.
 * - Disconnects on unmount or when the user logs out.
 *
 * Place this hook once at the root layout or providers component.
 */
export function useSocket() {
  const { isAuthenticated, tokens, user } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !tokens?.accessToken) {
      // Not authenticated — ensure socket is disconnected
      disconnectSocket();
      socketRef.current = null;
      return;
    }

    const socket = getSocket(tokens.accessToken);
    socketRef.current = socket;

    // Join personal room once connected
    const handleConnect = () => {
      if (user?.id) {
        socket.emit('JOIN_USER_ROOM', user.id);
      }
    };

    if (socket.connected) {
      handleConnect();
    } else {
      socket.on('connect', handleConnect);
    }

    return () => {
      socket.off('connect', handleConnect);
    };
  }, [isAuthenticated, tokens?.accessToken, user?.id]);

  return socketRef.current;
}
