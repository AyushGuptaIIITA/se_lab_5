import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const getSocketURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');
  }
  // Try same host port 5000 or same origin (via Vite proxy)
  if (typeof window !== 'undefined' && window.location) {
    const port = window.location.port;
    if (port === '5173') {
      return `${window.location.protocol}//${window.location.hostname}:5000`;
    }
    return window.location.origin;
  }
  return 'http://localhost:5000';
};

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const listenersRef = useRef([]); // [{ event, handler }]
  const appointmentRoomsRef = useRef(new Set()); // survive reconnects so WebRTC signaling keeps working
  const userIdRef = useRef(null);

  useEffect(() => {
    userIdRef.current = user?._id ? user._id.toString() : null;
  }, [user?._id]);

  useEffect(() => {
    const url = getSocketURL();
    const socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      if (userIdRef.current) {
        console.log('[SOCKET CONTEXT] Connected, joining user room:', userIdRef.current);
        socket.emit('join:user', userIdRef.current);
      }
      // Re-join all appointment rooms after reconnect (critical for live video)
      appointmentRoomsRef.current.forEach((apptId) => {
        socket.emit('join:appointment', apptId);
      });
      // Re-attach all registered listeners
      listenersRef.current.forEach(({ event, handler }) => {
        socket.off(event, handler);
        socket.on(event, handler);
      });
    });

    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => {
      setConnected(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-join user room whenever user logs in or updates
  useEffect(() => {
    if (socketRef.current && user?._id) {
      console.log('[SOCKET CONTEXT] User changed, joining user room:', user._id.toString());
      socketRef.current.emit('join:user', user._id.toString());
    }
  }, [user?._id]);

  /**
   * Join an appointment-specific room
   */
  const joinAppointmentRoom = useCallback((appointmentId) => {
    if (!appointmentId) return;
    const id = appointmentId.toString();
    appointmentRoomsRef.current.add(id);
    if (socketRef.current) {
      socketRef.current.emit('join:appointment', id);
    }
  }, []);

  /**
   * Subscribe to a socket event. Always registers in persistent listener list.
   */
  const subscribe = useCallback((event, handler) => {
    const entry = { event, handler };
    listenersRef.current.push(entry);

    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }

    return () => {
      listenersRef.current = listenersRef.current.filter(e => e !== entry);
      if (socketRef.current) {
        socketRef.current.off(event, handler);
      }
    };
  }, []);

  /**
   * Emit an event through socket
   */
  const emitEvent = useCallback((event, payload) => {
    if (socketRef.current) {
      socketRef.current.emit(event, payload);
    }
  }, []);

  return (
    <SocketContext.Provider value={{ 
      socket: socketRef.current, 
      socketRef, 
      connected, 
      subscribe, 
      joinAppointmentRoom,
      emit: emitEvent 
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
