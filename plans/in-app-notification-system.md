# In-App Notification System for Prescription Alerts

## Overview
Add a real-time, persistent in-app notification system that alerts patients when a doctor creates a prescription for them. No email required - purely in-app with real-time Socket.io updates and persistent storage.

## Architecture

```
Doctor Creates Prescription → Backend emits 'prescription:new' via Socket.io
                                    ↓
                    Patient receives real-time notification (if online)
                                    ↓
                    Notification stored in database (persistent)
                                    ↓
                    Patient sees bell icon with badge count
                                    ↓
                    Notification Center shows all notifications
                                    ↓
                    Click notification → Navigate to prescription
```

## Backend Changes

### 1. Notification Model
```javascript
// backend/models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who triggered it
  type: { 
    type: String, 
    enum: [
      'PRESCRIPTION_CREATED',
      'PRESCRIPTION_SENT_TO_PHARMACY', 
      'APPOINTMENT_BOOKED',
      'APPOINTMENT_REMINDER',
      'APPOINTMENT_CANCELLED',
      'CONSULTATION_STARTED',
      'CONSULTATION_ENDED',
      'REFILL_REQUESTED',
      'REFILL_APPROVED',
      'REFILL_DECLINED',
      'LAB_RESULT_READY',
      'SYSTEM_ANNOUNCEMENT'
    ],
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed }, // { prescriptionId, appointmentId, etc. }
  read: { type: Boolean, default: false, index: true },
  readAt: { type: Date },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  actionUrl: { type: String }, // Deep link for navigation
}, { timestamps: true });

// Compound index for efficient queries
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
```

### 2. Notification Service
```javascript
// backend/services/notificationService.js
const Notification = require('../models/Notification');
const emit = require('../utils/emit');

class NotificationService {
  // Create and emit notification
  static async create({ recipientId, actorId, type, title, message, data = {}, priority = 'normal', actionUrl = '' }) {
    const notification = new Notification({
      recipient: recipientId,
      actor: actorId,
      type,
      title,
      message,
      data,
      priority,
      actionUrl
    });
    
    await notification.save();
    
    // Populate actor for real-time emit
    await notification.populate('actor', 'name role');
    
    // Emit real-time via Socket.io
    try {
      emit(null, 'notification:new', {
        notification: {
          _id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          priority: notification.priority,
          actionUrl: notification.actionUrl,
          read: notification.read,
          createdAt: notification.createdAt,
          actor: notification.actor
        }
      }, recipientId.toString());
    } catch (e) {
      console.warn('Socket emit failed for notification:', e.message);
    }
    
    return notification;
  }
  
  // Get user notifications with pagination
  static async getForUser(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
    const filter = { recipient: userId };
    if (unreadOnly) filter.read = false;
    
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .populate('actor', 'name role')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: userId, read: false })
    ]);
    
    return { notifications, total, unreadCount, pages: Math.ceil(total / limit) };
  }
  
  // Mark as read
  static async markAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { read: true, readAt: new Date() },
      { new: true }
    );
    
    if (notification) {
      emit(null, 'notification:read', { notificationId }, userId.toString());
    }
    
    return notification;
  }
  
  // Mark all as read
  static async markAllAsRead(userId) {
    await Notification.updateMany(
      { recipient: userId, read: false },
      { read: true, readAt: new Date() }
    );
    
    emit(null, 'notification:all-read', {}, userId.toString());
  }
  
  // Delete notification
  static async delete(notificationId, userId) {
    return Notification.findOneAndDelete({ _id: notificationId, recipient: userId });
  }
}

module.exports = NotificationService;
```

### 3. Notification Routes
```javascript
// backend/routes/notifications.js
const express = require('express');
const { auth } = require('../middleware/auth');
const NotificationService = require('../services/notificationService');

const router = express.Router();

// GET /api/notifications - Get user notifications
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const result = await NotificationService.getForUser(req.user._id, {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true'
    });
    res.json(result);
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ message: 'Server error fetching notifications.' });
  }
});

// GET /api/notifications/unread-count - Get unread count only
router.get('/unread-count', auth, async (req, res) => {
  try {
    const result = await NotificationService.getForUser(req.user._id, { limit: 1 });
    res.json({ unreadCount: result.unreadCount });
  } catch (err) {
    console.error('Get unread count error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// PATCH /api/notifications/:id/read - Mark as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const notification = await NotificationService.markAsRead(req.params.id, req.user._id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }
    res.json({ notification });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// PATCH /api/notifications/read-all - Mark all as read
router.patch('/read-all', auth, async (req, res) => {
  try {
    await NotificationService.markAllAsRead(req.user._id);
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await NotificationService.delete(req.params.id, req.user._id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }
    res.json({ message: 'Notification deleted.' });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
```

### 4. Integrate with Prescription Creation
```javascript
// In backend/routes/prescriptions.js - POST /api/prescriptions
// After prescription.save() and audit log, add:

const NotificationService = require('../services/notificationService');

// Create in-app notification for patient
await NotificationService.create({
  recipientId: appointment.patient._id,
  actorId: req.user._id,
  type: 'PRESCRIPTION_CREATED',
  title: 'New Prescription Ready',
  message: `Dr. ${req.user.name} has issued a new e-prescription for your consultation.`,
  data: {
    prescriptionId: prescription._id,
    appointmentId: appointment._id,
    doctorName: req.user.name,
    diagnosis: diagnosis
  },
  priority: 'high',
  actionUrl: `/prescription/appointment/${appointmentId}`
});
```

## Frontend Changes

### 1. Notification Context
```javascript
// frontend/src/contexts/NotificationContext.jsx
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

// Simple notification sound
function playNotificationSound() {
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  } catch (e) {}
}
```

### 2. Notification Bell Component (Navbar)
```javascript
// frontend/src/components/NotificationBell.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, ChevronRight, Loader2 } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { useNavigate, useLocation } from 'react-router-dom';

export default function NotificationBell() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification, fetchNotifications } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Load more on scroll
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 50 && hasMore && !loading) {
      setPage(p => p + 1);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) markAsRead(notification._id);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
    setOpen(false);
  };

  const getNotificationIcon = (type) => {
    const icons = {
      PRESCRIPTION_CREATED: '💊',
      PRESCRIPTION_SENT_TO_PHARMACY: '🚚',
      APPOINTMENT_BOOKED: '📅',
      APPOINTMENT_REMINDER: '⏰',
      APPOINTMENT_CANCELLED: '❌',
      CONSULTATION_STARTED: '🎥',
      CONSULTATION_ENDED: '✅',
      REFILL_REQUESTED: '🔄',
      REFILL_APPROVED: '✅',
      REFILL_DECLINED: '❌',
      LAB_RESULT_READY: '🧪',
      SYSTEM_ANNOUNCEMENT: '📢'
    };
    return icons[type] || '🔔';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'text-slate-500',
      normal: 'text-blue-600',
      high: 'text-amber-600',
      urgent: 'text-rose-600'
    };
    return colors[priority] || 'text-blue-600';
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`relative p-2 rounded-xl transition-all ${
          unreadCount > 0 
            ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' 
            : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
        }`}
        title={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'Notifications'}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 animate-in fade-in overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Mark all as read"
                >
                  <Check className="w-3 h-3 inline-block mr-1" />
                  Read All
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[500px] overflow-y-auto" onScroll={handleScroll}>
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-700">No notifications yet</p>
                <p className="text-xs text-slate-400 mt-0.5">You'll see prescription alerts and updates here</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notification, index) => (
                  <button
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full p-3.5 text-left transition-colors ${
                      !notification.read 
                        ? 'bg-blue-50/50 hover:bg-blue-50' 
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-lg flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`font-bold text-sm ${!notification.read ? 'text-slate-900' : 'text-slate-700'}`}>
                            {notification.title}
                          </h4>
                          <span className={`text-[10px] font-bold ${getPriorityColor(notification.priority)} flex-shrink-0`}>
                            {notification.priority.toUpperCase()}
                          </span>
                        </div>
                        <p className={`text-xs mt-0.5 ${!notification.read ? 'text-slate-600' : 'text-slate-500'}`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-slate-400">
                            {formatTime(notification.createdAt)}
                          </span>
                          {!notification.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification._id);
                        }}
                        className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0"
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </button>
                ))}
                {hasMore && loading && (
                  <div className="p-3 text-center">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600 mx-auto" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-100 bg-slate-50/50">
            <button
              onClick={() => navigate('/notifications')}
              className="w-full text-center text-xs font-bold text-blue-600 hover:text-blue-700 py-1.5"
            >
              View All Notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 3. Integrate into Navbar
```javascript
// In frontend/src/components/Navbar.jsx
import NotificationBell from './NotificationBell';
import { useNotifications } from '../contexts/NotificationContext';

// Inside Navbar component, add to right section:
const { unreadCount } = useNotifications();

// In the right section (around line 196):
<div className="hidden lg:flex items-center space-x-2 flex-shrink-0">
  <NotificationBell />
  {/* ... existing language dropdown, user chip, logout ... */}
</div>

// Also add to mobile menu (around line 308):
<div className="pt-3 border-t border-slate-100 flex items-center justify-between">
  <NotificationBell />
  {/* ... existing profile link, logout ... */}
</div>
```

### 4. Add NotificationContext to App
```javascript
// In frontend/src/main.jsx or App.jsx
import { NotificationProvider } from './contexts/NotificationContext';

// Wrap app:
<AuthProvider>
  <LanguageProvider>
    <SocketProvider>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </SocketProvider>
  </LanguageProvider>
</AuthProvider>
```

### 5. Full Notifications Page (Optional)
```javascript
// frontend/src/pages/Notifications.jsx
import React, { useEffect, useState } from 'react';
import { Bell, Check, X, Loader2 } from 'lucide-react';
import Layout from '../components/Layout';
import { useNotifications } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';

export default function NotificationsPage() {
  const { notifications, unreadCount, loading, fetchNotifications, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 100 && hasMore && !loading) {
      setPage(p => p + 1);
    }
  };

  const loadMore = () => {
    fetchNotifications(page + 1);
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center space-x-2">
              <Bell className="w-6 h-6 text-blue-600" />
              <span>Notifications</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark All Read</span>
            </button>
          )}
        </div>

        {loading && notifications.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl bg-white text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-slate-600">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl bg-white text-center">
            <Bell className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h2 className="text-lg font-bold text-slate-900">No Notifications</h2>
            <p className="text-sm text-slate-500 mt-2">You're all caught up! New prescriptions and updates will appear here.</p>
          </div>
        ) : (
          <div className="glass-panel rounded-2xl bg-white overflow-hidden" onScroll={handleScroll}>
            <div className="divide-y divide-slate-100">
              {notifications.map((notification) => (
                <button
                  key={notification._id}
                  onClick={() => {
                    if (!notification.read) markAsRead(notification._id);
                    if (notification.actionUrl) navigate(notification.actionUrl);
                  }}
                  className={`w-full p-4.5 text-left transition-colors border-b border-slate-100 last:border-0 ${
                    !notification.read ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                      notification.priority === 'urgent' ? 'bg-rose-100' :
                      notification.priority === 'high' ? 'bg-amber-100' :
                      notification.priority === 'normal' ? 'bg-blue-100' : 'bg-slate-100'
                    }`}>
                      {notification.type === 'PRESCRIPTION_CREATED' && '💊'}
                      {notification.type === 'PRESCRIPTION_SENT_TO_PHARMACY' && '🚚'}
                      {notification.type === 'APPOINTMENT_BOOKED' && '📅'}
                      {notification.type === 'APPOINTMENT_REMINDER' && '⏰'}
                      {notification.type === 'CONSULTATION_STARTED' && '🎥'}
                      {notification.type === 'CONSULTATION_ENDED' && '✅'}
                      {notification.type === 'REFILL_REQUESTED' && '🔄'}
                      {notification.type === 'REFILL_APPROVED' && '✅'}
                      {notification.type === 'REFILL_DECLINED' && '❌'}
                      {notification.type === 'LAB_RESULT_READY' && '🧪'}
                      {notification.type === 'SYSTEM_ANNOUNCEMENT' && '📢'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={`font-bold text-base ${!notification.read ? 'text-slate-900' : 'text-slate-700'}`}>
                          {notification.title}
                        </h3>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            notification.priority === 'urgent' ? 'bg-rose-100 text-rose-700' :
                            notification.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                            notification.priority === 'normal' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {notification.priority.toUpperCase()}
                          </span>
                          {!notification.read && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                      <p className={`text-sm mt-1 ${!notification.read ? 'text-slate-600' : 'text-slate-500'}`}>
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-slate-400">
                          {new Date(notification.createdAt).toLocaleString('en-IN', { 
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                          })}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification._id);
                          }}
                          className="text-xs text-slate-400 hover:text-rose-500 font-semibold"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {hasMore && (
              <div className="p-4 border-t border-slate-100">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="w-full py-2 rounded-xl text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading more...</span>
                    </>
                  ) : (
                    <>
                      <span>Load More Notifications</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
```

## Socket.io Server-Side Updates

### In backend/utils/emit.js
```javascript
// Add targeted emit to specific user
function emitToUser(req, userId, event, payload) {
  try {
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${userId}`).emit(event, payload);
    }
  } catch (e) {
    console.warn('Socket emit to user failed:', e.message);
  }
}

module.exports = { emit, emitToUser };
```

### In backend/server.js (Socket.io setup)
```javascript
// When user connects, join their personal room
socket.on('join:user', (userId) => {
  socket.join(`user:${userId}`);
});
```

## Database Migration
```javascript
// Run once to create notifications collection
// backend/scripts/createNotificationsIndex.js
const mongoose = require('mongoose');
require('dotenv').config();

async function createIndexes() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  
  await db.collection('notifications').createIndex({ recipient: 1, read: 1, createdAt: -1 });
  await db.collection('notifications').createIndex({ recipient: 1, createdAt: -1 });
  
  console.log('Notification indexes created');
  process.exit(0);
}

createIndexes().catch(console.error);
```

## Summary of Files to Create/Modify

### New Files:
1. `backend/models/Notification.js`
2. `backend/services/notificationService.js`
3. `backend/routes/notifications.js`
4. `frontend/src/contexts/NotificationContext.jsx`
5. `frontend/src/components/NotificationBell.jsx`
6. `frontend/src/pages/Notifications.jsx` (optional)

### Modified Files:
1. `backend/routes/prescriptions.js` - Add notification on prescription creation
2. `backend/utils/emit.js` - Add emitToUser function
3. `backend/server.js` - Add user room joining
4. `frontend/src/components/Navbar.jsx` - Add NotificationBell
5. `frontend/src/main.jsx` or `App.jsx` - Add NotificationProvider
6. `frontend/src/App.jsx` - Add `/notifications` route

## Notification Types & Priorities

| Type | Priority | Title | Action URL |
|------|----------|-------|------------|
| PRESCRIPTION_CREATED | high | New Prescription Ready | `/prescription/appointment/{id}` |
| PRESCRIPTION_SENT_TO_PHARMACY | normal | Prescription Sent to Pharmacy | `/prescription/appointment/{id}` |
| APPOINTMENT_BOOKED | normal | Appointment Confirmed | `/patient/appointments` |
| APPOINTMENT_REMINDER | high | Upcoming Appointment | `/patient/consultation/{id}` |
| APPOINTMENT_CANCELLED | high | Appointment Cancelled | `/patient/appointments` |
| CONSULTATION_STARTED | normal | Doctor Started Consultation | `/patient/consultation/{id}` |
| CONSULTATION_ENDED | normal | Consultation Ended | `/prescription/appointment/{id}` |
| REFILL_REQUESTED | normal | Refill Requested | `/patient/prescriptions` |
| REFILL_APPROVED | high | Refill Approved | `/patient/prescriptions` |
| REFILL_DECLINED | normal | Refill Declined | `/patient/prescriptions` |
| LAB_RESULT_READY | high | Lab Results Ready | `/patient/medical-records` |
| SYSTEM_ANNOUNCEMENT | low | System Update | `/` |

## Testing Checklist
- [ ] Doctor creates prescription → Patient sees real-time notification (bell badge increments)
- [ ] Patient clicks notification → Navigates to prescription view
- [ ] Notification marked as read → Badge count decrements
- [ ] "Mark all read" works
- [ ] Notifications persist after page refresh
- [ ] Unread count loads on app init
- [ ] Mobile responsive dropdown works
- [ ] Notification sound plays (optional)
- [ ] Multiple notification types work
- [ ] Pagination loads more notifications