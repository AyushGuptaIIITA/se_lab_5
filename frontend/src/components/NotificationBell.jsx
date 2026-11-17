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