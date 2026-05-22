const path = require('path');
const fs   = require('fs');
const pool = require('../config/db');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// POST /api/attachments/article/:articleId
const uploadAttachment = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 'No file uploaded.', 400);

    const { articleId } = req.params;
    const [articles] = await pool.query('SELECT id, author_id FROM articles WHERE id = ?', [articleId]);
    if (articles.length === 0) return sendError(res, 'Article not found.', 404);

    const article = articles[0];
    const isAdmin = req.user.role_name === 'admin';
    const isOwner = article.author_id === req.user.id;
    if (!isAdmin && !isOwner) return sendError(res, 'Not authorised to attach files to this article.', 403);

    const { originalname, filename, mimetype, size, path: filePath } = req.file;
    const ext = path.extname(originalname).toLowerCase();
    const isImage = ['image/jpeg','image/jpg','image/png','image/gif','image/webp'].includes(mimetype);

    const [result] = await pool.query(
      `INSERT INTO attachments
         (article_id, uploaded_by, original_name, stored_name, file_path, file_type, file_extension, file_size_bytes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [articleId, req.user.id, originalname, filename, filePath, mimetype, ext, size]
    );

    const [rows] = await pool.query('SELECT * FROM attachments WHERE id = ?', [result.insertId]);
    return sendCreated(res, { attachment: rows[0] }, 'File uploaded successfully.');
  } catch (err) { next(err); }
};

// GET /api/attachments/:id/download
const downloadAttachment = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM attachments WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return sendError(res, 'File not found.', 404);

    const att = rows[0];
    const filePath = path.join(UPLOAD_DIR, att.stored_name);

    if (!fs.existsSync(filePath)) return sendError(res, 'File no longer exists on server.', 404);

    await pool.query('UPDATE attachments SET download_count = download_count + 1 WHERE id = ?', [att.id]);

    res.setHeader('Content-Disposition', `attachment; filename="${att.original_name}"`);
    res.setHeader('Content-Type', att.file_type || 'application/octet-stream');
    return res.sendFile(filePath);
  } catch (err) { next(err); }
};

// DELETE /api/attachments/:id
const deleteAttachment = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, art.author_id FROM attachments a
       JOIN articles art ON a.article_id = art.id WHERE a.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return sendError(res, 'Attachment not found.', 404);

    const att = rows[0];
    const isAdmin = req.user.role_name === 'admin';
    const isOwner = att.uploaded_by === req.user.id || att.author_id === req.user.id;
    if (!isAdmin && !isOwner) return sendError(res, 'Not authorised.', 403);

    // Delete file from disk
    const filePath = path.join(UPLOAD_DIR, att.stored_name);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await pool.query('DELETE FROM attachments WHERE id = ?', [att.id]);
    return sendSuccess(res, null, 'Attachment deleted.');
  } catch (err) { next(err); }
};

// GET /api/attachments/article/:articleId
const listAttachments = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, original_name, file_type, file_extension, file_size_bytes, download_count, created_at
       FROM attachments WHERE article_id = ? ORDER BY created_at DESC`,
      [req.params.articleId]
    );
    return sendSuccess(res, { attachments: rows });
  } catch (err) { next(err); }
};

module.exports = { uploadAttachment, downloadAttachment, deleteAttachment, listAttachments };
