import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  // Store pending listeners so we can re-attach after reconnect
  const listenersRef = useRef([]); // [{ event, handler }]

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      // Re-join user room on (re)connect
      if (user?._id) {
        socket.emit('join:user', user._id);
      }
      // Re-attach all pending listeners so nothing is missed after reconnect
      listenersRef.current.forEach(({ event, handler }) => {
        socket.off(event, handler); // avoid duplicates
        socket.on(event, handler);
      });
    });

    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-join user room when user logs in / changes
  useEffect(() => {
    if (socketRef.current?.connected && user?._id) {
      socketRef.current.emit('join:user', user._id);
    }
  }, [user?._id]);

  /**
   * Join an appointment-specific room (called from ConsultationRoom)
   */
  const joinAppointmentRoom = useCallback((appointmentId) => {
    if (socketRef.current && appointmentId) {
      socketRef.current.emit('join:appointment', appointmentId);
    }
  }, []);

  /**
   * Subscribe to a socket event. Returns an unsubscribe function.
   * Safe to call even before socket connects — listener is registered immediately
   * and re-attached on reconnect.
   */
  const subscribe = useCallback((event, handler) => {
    // Register in persistent list so it survives reconnects
    const entry = { event, handler };
    listenersRef.current.push(entry);

    // Attach now if already connected
    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }

    return () => {
      // Remove from persistent list
      listenersRef.current = listenersRef.current.filter(e => e !== entry);
      // Detach from live socket
      if (socketRef.current) {
        socketRef.current.off(event, handler);
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef, connected, subscribe, joinAppointmentRoom }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
