const pool = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');

const notify = async (userId, triggeredBy, type, title, message, linkUrl = null) => {
  await pool.query(
    `INSERT INTO notifications (user_id, triggered_by, type, title, message, link_url)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, triggeredBy, type, title, message, linkUrl]
  );
};

// GET /api/approvals  — all workflows (reviewer/admin)
const listApprovals = async (req, res, next) => {
  try {
    const { status } = req.query;
    let where = '';
    const params = [];
    if (status) { where = 'WHERE aw.status = ?'; params.push(status); }

    const [rows] = await pool.query(
      `SELECT aw.id, aw.status, aw.author_note, aw.reviewer_comment,
              aw.submitted_at, aw.reviewed_at,
              a.id AS article_id, a.title AS article_title, a.slug AS article_slug,
              a.status AS article_status, a.version_number,
              CONCAT(sub.first_name,' ',sub.last_name) AS submitted_by_name,
              CONCAT(rv.first_name,' ',rv.last_name) AS reviewer_name,
              aw.reviewer_id
       FROM approval_workflows aw
       JOIN articles a ON aw.article_id = a.id
       JOIN users sub ON aw.submitted_by = sub.id
       LEFT JOIN users rv ON aw.reviewer_id = rv.id
       ${where}
       ORDER BY aw.submitted_at DESC`,
      params
    );
    return sendSuccess(res, { approvals: rows });
  } catch (err) { next(err); }
};

// PUT /api/approvals/:id/assign
const assignReviewer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reviewer_id } = req.body;

    const [rows] = await pool.query('SELECT * FROM approval_workflows WHERE id = ?', [id]);
    if (rows.length === 0) return sendError(res, 'Approval workflow not found.', 404);

    await pool.query(
      "UPDATE approval_workflows SET reviewer_id = ?, status = 'under_review' WHERE id = ?",
      [reviewer_id, id]
    );
    return sendSuccess(res, null, 'Reviewer assigned.');
  } catch (err) { next(err); }
};

// PUT /api/approvals/:id/approve
const approveArticle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    const [rows] = await pool.query(
      `SELECT aw.*, a.title, a.slug, a.author_id
       FROM approval_workflows aw JOIN articles a ON aw.article_id = a.id
       WHERE aw.id = ?`, [id]
    );
    if (rows.length === 0) return sendError(res, 'Not found.', 404);

    const wf = rows[0];
    await pool.query(
      `UPDATE approval_workflows
       SET status='approved', reviewer_id=?, reviewer_comment=?, reviewed_at=NOW()
       WHERE id=?`,
      [req.user.id, comment || null, id]
    );
    await pool.query(
      "UPDATE articles SET status='approved' WHERE id=?", [wf.article_id]
    );

    await notify(wf.author_id, req.user.id, 'article_approved',
      'Article Approved',
      `Your article "${wf.title}" has been approved. You can now publish it.`,
      `/articles/${wf.slug}`
    );
    return sendSuccess(res, null, 'Article approved.');
  } catch (err) { next(err); }
};

// PUT /api/approvals/:id/reject
const rejectArticle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    if (!comment) return sendError(res, 'A rejection comment is required.', 400);

    const [rows] = await pool.query(
      `SELECT aw.*, a.title, a.slug, a.author_id
       FROM approval_workflows aw JOIN articles a ON aw.article_id = a.id
       WHERE aw.id = ?`, [id]
    );
    if (rows.length === 0) return sendError(res, 'Not found.', 404);

    const wf = rows[0];
    await pool.query(
      `UPDATE approval_workflows
       SET status='rejected', reviewer_id=?, reviewer_comment=?, reviewed_at=NOW()
       WHERE id=?`,
      [req.user.id, comment, id]
    );
    await pool.query("UPDATE articles SET status='rejected' WHERE id=?", [wf.article_id]);

    await notify(wf.author_id, req.user.id, 'article_rejected',
      'Article Rejected',
      `Your article "${wf.title}" was rejected. Reason: ${comment}`,
      `/articles/${wf.slug}`
    );
    return sendSuccess(res, null, 'Article rejected.');
  } catch (err) { next(err); }
};

// PUT /api/approvals/:id/revision
const requestRevision = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    if (!comment) return sendError(res, 'Please provide revision instructions.', 400);

    const [rows] = await pool.query(
      `SELECT aw.*, a.title, a.slug, a.author_id
       FROM approval_workflows aw JOIN articles a ON aw.article_id = a.id
       WHERE aw.id = ?`, [id]
    );
    if (rows.length === 0) return sendError(res, 'Not found.', 404);

    const wf = rows[0];
    await pool.query(
      `UPDATE approval_workflows
       SET status='revision_requested', reviewer_id=?, reviewer_comment=?, reviewed_at=NOW()
       WHERE id=?`,
      [req.user.id, comment, id]
    );
    await pool.query("UPDATE articles SET status='draft' WHERE id=?", [wf.article_id]);

    await notify(wf.author_id, req.user.id, 'revision_requested',
      'Revision Requested',
      `Revisions requested on "${wf.title}": ${comment}`,
      `/articles/${wf.slug}`
    );
    return sendSuccess(res, null, 'Revision requested.');
  } catch (err) { next(err); }
};

module.exports = { listApprovals, assignReviewer, approveArticle, rejectArticle, requestRevision };
