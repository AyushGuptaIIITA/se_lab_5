const Notification = require('../models/Notification');
const { emitToUser } = require('../utils/emit');

class NotificationService {
  /**
   * Create and emit notification
   * @param {Object} params - Notification parameters
   * @param {string|ObjectId} params.recipientId - Recipient user ID
   * @param {string|ObjectId} params.actorId - Actor user ID (who triggered)
   * @param {string} params.type - Notification type
   * @param {string} params.title - Notification title
   * @param {string} params.message - Notification message
   * @param {Object} params.data - Additional data
   * @param {string} params.priority - Priority level
   * @param {string} params.actionUrl - Deep link for navigation
   * @param {Object} params.req - Express request object (for real-time emit)
   * @returns {Promise<Object>} Created notification
   */
  static async create({ recipientId, actorId, type, title, message, data = {}, priority = 'normal', actionUrl = '', req = null }) {
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
    
    // Emit real-time via Socket.io if req is provided
    if (req) {
      try {
        emitToUser(req, recipientId.toString(), 'notification:new', {
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
        });
      } catch (e) {
        console.warn('Socket emit failed for notification:', e.message);
      }
    }
    
    return notification;
  }
  
  /**
   * Get user notifications with pagination
   * @param {string|ObjectId} userId - User ID
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @param {boolean} options.unreadOnly - Filter unread only
   * @returns {Promise<Object>} Notifications with pagination info
   */
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
    
    return { 
      notifications, 
      total, 
      unreadCount, 
      pages: Math.ceil(total / limit) 
    };
  }
  
  /**
   * Mark notification as read
   * @param {string|ObjectId} notificationId - Notification ID
   * @param {string|ObjectId} userId - User ID (for authorization)
   * @returns {Promise<Object|null>} Updated notification
   */
  static async markAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { read: true, readAt: new Date() },
      { new: true }
    );
    
    return notification;
  }
  
  /**
   * Mark all notifications as read for a user
   * @param {string|ObjectId} userId - User ID
   * @returns {Promise<Object>} Update result
   */
  static async markAllAsRead(userId) {
    return Notification.updateMany(
      { recipient: userId, read: false },
      { read: true, readAt: new Date() }
    );
  }
  
  /**
   * Delete notification
   * @param {string|ObjectId} notificationId - Notification ID
   * @param {string|ObjectId} userId - User ID (for authorization)
   * @returns {Promise<Object|null>} Deleted notification
   */
  static async delete(notificationId, userId) {
    return Notification.findOneAndDelete({ _id: notificationId, recipient: userId });
  }
  
  /**
   * Get unread count for user
   * @param {string|ObjectId} userId - User ID
   * @returns {Promise<number>} Unread count
   */
  static async getUnreadCount(userId) {
    return Notification.countDocuments({ recipient: userId, read: false });
  }
}

module.exports = NotificationService;