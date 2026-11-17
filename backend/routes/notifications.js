const express = require('express');
const { auth } = require('../middleware/auth');
const NotificationService = require('../services/notificationService');
const { emit, emitToUser } = require('../utils/emit');

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
    const unreadCount = await NotificationService.getUnreadCount(req.user._id);
    res.json({ unreadCount });
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
    
    // Emit real-time update
    try {
      emitToUser(req, req.user._id.toString(), 'notification:read', { notificationId: req.params.id });
    } catch (e) {}
    
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
    
    // Emit real-time update
    try {
      emitToUser(req, req.user._id.toString(), 'notification:all-read', {});
    } catch (e) {}
    
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