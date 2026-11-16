import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Connect socket
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      // Join user's personal room so server can target us
      if (user?._id) {
        socket.emit('join:user', user._id);
      }
    });

    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-join user room when user logs in/changes
  useEffect(() => {
    if (socketRef.current?.connected && user?._id) {
      socketRef.current.emit('join:user', user._id);
    }
  }, [user?._id]);

  /**
   * Join an appointment-specific room (call from ConsultationRoom)
   */
  const joinAppointmentRoom = (appointmentId) => {
    if (socketRef.current && appointmentId) {
      socketRef.current.emit('join:appointment', appointmentId);
    }
  };

  /**
   * Subscribe to a socket event. Returns an unsubscribe function.
   * Usage: useEffect(() => subscribe('appointment:updated', handler), []);
   */
  const subscribe = (event, handler) => {
    const sock = socketRef.current;
    if (!sock) return () => {};
    sock.on(event, handler);
    return () => sock.off(event, handler);
  };

  return (
    <SocketContext.Provider value={{ socket: socketRef, connected, subscribe, joinAppointmentRoom }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
