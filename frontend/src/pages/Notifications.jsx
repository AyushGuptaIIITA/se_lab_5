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
      low: 'bg-slate-100 text-slate-700',
      normal: 'bg-blue-100 text-blue-700',
      high: 'bg-amber-100 text-amber-700',
      urgent: 'bg-rose-100 text-rose-700'
    };
    return colors[priority] || 'bg-blue-100 text-blue-700';
  };

  const getPriorityBg = (priority) => {
    const colors = {
      low: 'bg-slate-100',
      normal: 'bg-blue-100',
      high: 'bg-amber-100',
      urgent: 'bg-rose-100'
    };
    return colors[priority] || 'bg-blue-100';
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
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${getPriorityBg(notification.priority)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={`font-bold text-base ${!notification.read ? 'text-slate-900' : 'text-slate-700'}`}>
                          {notification.title}
                        </h3>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getPriorityColor(notification.priority)}`}>
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