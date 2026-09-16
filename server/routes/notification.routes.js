const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Get User Notifications
router.get('/', async (req, res) => {
  try {
    const notifications = await db.query(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );

    const unreadCount = await db.get(
      'SELECT count(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );

    res.json({
      notifications,
      unreadCount: unreadCount ? unreadCount.count : 0
    });
  } catch (err) {
    console.error('[Notifications GET] Error:', err);
    res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
});

// Mark single notification as read
router.patch('/:id/read', async (req, res) => {
  try {
    await db.run(
      'UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[Notification Mark Read] Error:', err);
    res.status(500).json({ error: 'Failed to update notification.' });
  }
});

// Mark all notifications as read
router.post('/read-all', async (req, res) => {
  try {
    await db.run(
      'UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('[Notification Mark All Read] Error:', err);
    res.status(500).json({ error: 'Failed to mark all as read.' });
  }
});

module.exports = router;
