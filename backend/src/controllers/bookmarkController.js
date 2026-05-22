const pool = require('../config/db');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');

// GET /api/bookmarks
const getBookmarks = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.id, b.note, b.created_at,
              a.id AS article_id, a.title, a.slug, a.summary, a.status,
              a.avg_rating, a.view_count, a.published_at,
              c.name AS category_name, c.color_code AS category_color,
              CONCAT(u.first_name,' ',u.last_name) AS author_name
       FROM bookmarks b
       JOIN articles a    ON b.article_id  = a.id
       JOIN categories c  ON a.category_id = c.id
       JOIN users u       ON a.author_id   = u.id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    return sendSuccess(res, { bookmarks: rows });
  } catch (err) { next(err); }
};

// POST /api/bookmarks/:articleId
const addBookmark = async (req, res, next) => {
  try {
    const { articleId } = req.params;
    const { note } = req.body;

    const [arts] = await pool.query('SELECT id FROM articles WHERE id = ?', [articleId]);
    if (arts.length === 0) return sendError(res, 'Article not found.', 404);

    await pool.query(
      'INSERT IGNORE INTO bookmarks (user_id, article_id, note) VALUES (?, ?, ?)',
      [req.user.id, articleId, note || null]
    );
    return sendCreated(res, null, 'Bookmark added.');
  } catch (err) { next(err); }
};

// DELETE /api/bookmarks/:articleId
const removeBookmark = async (req, res, next) => {
  try {
    await pool.query(
      'DELETE FROM bookmarks WHERE user_id = ? AND article_id = ?',
      [req.user.id, req.params.articleId]
    );
    return sendSuccess(res, null, 'Bookmark removed.');
  } catch (err) { next(err); }
};

// GET /api/bookmarks/check/:articleId
const checkBookmark = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id FROM bookmarks WHERE user_id = ? AND article_id = ?',
      [req.user.id, req.params.articleId]
    );
    return sendSuccess(res, { bookmarked: rows.length > 0 });
  } catch (err) { next(err); }
};

module.exports = { getBookmarks, addBookmark, removeBookmark, checkBookmark };
