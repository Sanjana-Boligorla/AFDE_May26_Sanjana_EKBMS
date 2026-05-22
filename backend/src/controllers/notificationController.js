const pool = require('../config/db');
const { sendSuccess } = require('../utils/response');

// GET /api/notifications
const getNotifications = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT n.id, n.type, n.title, n.message, n.link_url, n.is_read, n.read_at, n.created_at,
              CONCAT(u.first_name,' ',u.last_name) AS triggered_by_name
       FROM notifications n
       LEFT JOIN users u ON n.triggered_by = u.id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    const [[{ unread }]] = await pool.query(
      'SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );
    return sendSuccess(res, { notifications: rows, unread_count: unread });
  } catch (err) { next(err); }
};

// PUT /api/notifications/:id/read
const markRead = async (req, res, next) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    return sendSuccess(res, null, 'Notification marked as read.');
  } catch (err) { next(err); }
};

// PUT /api/notifications/read-all
const markAllRead = async (req, res, next) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );
    return sendSuccess(res, null, 'All notifications marked as read.');
  } catch (err) { next(err); }
};

module.exports = { getNotifications, markRead, markAllRead };
