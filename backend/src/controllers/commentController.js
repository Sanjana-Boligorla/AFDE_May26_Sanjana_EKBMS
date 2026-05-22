const pool = require('../config/db');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');

// GET /api/comments/article/:articleId
const listComments = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.content, c.parent_id, c.is_edited, c.created_at, c.updated_at,
              u.id AS user_id, CONCAT(u.first_name,' ',u.last_name) AS user_name,
              u.avatar_url
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.article_id = ? AND c.is_approved = TRUE
       ORDER BY c.created_at ASC`,
      [req.params.articleId]
    );

    // Build threaded structure
    const map = {};
    rows.forEach(r => { map[r.id] = { ...r, replies: [] }; });
    const threaded = [];
    rows.forEach(r => {
      if (r.parent_id && map[r.parent_id]) {
        map[r.parent_id].replies.push(map[r.id]);
      } else {
        threaded.push(map[r.id]);
      }
    });

    return sendSuccess(res, { comments: threaded, total: rows.length });
  } catch (err) { next(err); }
};

// POST /api/comments/article/:articleId
const addComment = async (req, res, next) => {
  try {
    const { articleId } = req.params;
    const { content, parent_id } = req.body;

    const [arts] = await pool.query(
      "SELECT id FROM articles WHERE id = ? AND status = 'published'", [articleId]
    );
    if (arts.length === 0) return sendError(res, 'Article not found or not published.', 404);

    const [result] = await pool.query(
      'INSERT INTO comments (article_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
      [articleId, req.user.id, parent_id || null, content]
    );
    const [rows] = await pool.query(
      `SELECT c.*, CONCAT(u.first_name,' ',u.last_name) AS user_name, u.avatar_url
       FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?`,
      [result.insertId]
    );
    return sendCreated(res, { comment: rows[0] }, 'Comment added.');
  } catch (err) { next(err); }
};

// PUT /api/comments/:id
const updateComment = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM comments WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return sendError(res, 'Comment not found.', 404);
    if (rows[0].user_id !== req.user.id && req.user.role_name !== 'admin') {
      return sendError(res, 'Not authorised.', 403);
    }
    await pool.query(
      'UPDATE comments SET content = ?, is_edited = TRUE WHERE id = ?',
      [req.body.content, req.params.id]
    );
    return sendSuccess(res, null, 'Comment updated.');
  } catch (err) { next(err); }
};

// DELETE /api/comments/:id
const deleteComment = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM comments WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return sendError(res, 'Comment not found.', 404);
    if (rows[0].user_id !== req.user.id && req.user.role_name !== 'admin') {
      return sendError(res, 'Not authorised.', 403);
    }
    await pool.query('DELETE FROM comments WHERE id = ?', [req.params.id]);
    return sendSuccess(res, null, 'Comment deleted.');
  } catch (err) { next(err); }
};

module.exports = { listComments, addComment, updateComment, deleteComment };
