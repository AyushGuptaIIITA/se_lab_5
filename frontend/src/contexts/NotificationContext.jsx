import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import api from '../services/api';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const { subscribe } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch initial notifications
  const fetchNotifications = useCallback(async (page = 1, unreadOnly = false) => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.get('/notifications', { 
        params: { page, limit: 20, unreadOnly } 
      });
      if (page === 1) {
        setNotifications(res.data.notifications || []);
      } else {
        setNotifications(prev => [...prev, ...(res.data.notifications || [])]);
      }
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, [user]);

  // Real-time listeners
  useEffect(() => {
    if (!user) return;
    
    fetchNotifications();
    fetchUnreadCount();

    const unsubNew = subscribe('notification:new', (payload) => {
      if (payload?.notification) {
        setNotifications(prev => [payload.notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        // Play notification sound
        playNotificationSound();
      }
    });

    const unsubRead = subscribe('notification:read', (payload) => {
      if (payload?.notificationId) {
        setNotifications(prev => prev.map(n => 
          n._id === payload.notificationId ? { ...n, read: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    });

    const unsubAllRead = subscribe('notification:all-read', () => {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    });

    return () => {
      unsubNew();
      unsubRead();
      unsubAllRead();
    };
  }, [user, subscribe, fetchNotifications, fetchUnreadCount]);

  // Actions
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      setNotifications(prev => prev.map(n => 
        n._id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Mark read failed:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Mark all read failed:', err);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
    } catch (err) {
      console.error('Delete notification failed:', err);
    }
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      fetchNotifications,
      fetchUnreadCount,
      markAsRead,
      markAllAsRead,
      deleteNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}

// Simple notification sound using base64 encoded WAV
function playNotificationSound() {
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  } catch (e) {}
}