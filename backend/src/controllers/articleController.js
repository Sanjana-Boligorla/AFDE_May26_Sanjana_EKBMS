const pool = require('../config/db');
const { sendSuccess, sendCreated, sendError, sendPaginated } = require('../utils/response');
const { slugify, makeUniqueSlug, getPagination, estimateReadTime } = require('../utils/helpers');

// ─── Helper: save a version snapshot ────────────────────────
const saveVersion = async (articleId, article, userId, note = null) => {
  await pool.query(
    `INSERT INTO article_versions
       (article_id, version_number, title, content, summary, changed_by, change_note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [articleId, article.version_number, article.title,
     article.content, article.summary || null, userId, note]
  );
};

// ─── Helper: send notification ───────────────────────────────
const notify = async (userId, triggeredBy, type, title, message, linkUrl = null) => {
  await pool.query(
    `INSERT INTO notifications (user_id, triggered_by, type, title, message, link_url)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, triggeredBy, type, title, message, linkUrl]
  );
};

// ────────────────────────────────────────────────────────────
// GET /api/articles
// ────────────────────────────────────────────────────────────
const listArticles = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const { status, category_id, tag_id, author_id, visibility, featured, sort } = req.query;

    const role = req.user?.role_name;
    const isPrivileged = ['admin', 'reviewer', 'author', 'hr', 'support'].includes(role);

    let whereClauses = [];
    let params = [];

    // Non-privileged users only see published articles
    if (!isPrivileged) {
      whereClauses.push("a.status = 'published'");
    } else if (status) {
      whereClauses.push('a.status = ?');
      params.push(status);
    }

    if (category_id) { whereClauses.push('a.category_id = ?'); params.push(category_id); }
    if (author_id)   { whereClauses.push('a.author_id = ?');   params.push(author_id); }
    if (visibility)  { whereClauses.push('a.visibility = ?');  params.push(visibility); }
    if (featured === 'true') { whereClauses.push('a.is_featured = TRUE'); }

    if (tag_id) {
      whereClauses.push('EXISTS (SELECT 1 FROM article_tags at WHERE at.article_id = a.id AND at.tag_id = ?)');
      params.push(tag_id);
    }

    const where = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const sortMap = {
      latest:   'a.created_at DESC',
      oldest:   'a.created_at ASC',
      popular:  'a.view_count DESC',
      rating:   'a.avg_rating DESC',
      az:       'a.title ASC',
    };
    const orderBy = sortMap[sort] || 'a.created_at DESC';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM articles a ${where}`, params
    );

    const [articles] = await pool.query(
      `SELECT a.id, a.title, a.slug, a.summary, a.status, a.visibility,
              a.is_featured, a.view_count, a.avg_rating, a.rating_count,
              a.version_number, a.read_time_minutes, a.published_at, a.created_at, a.updated_at,
              u.id AS author_id, CONCAT(u.first_name,' ',u.last_name) AS author_name,
              c.id AS category_id, c.name AS category_name, c.color_code AS category_color,
              GROUP_CONCAT(DISTINCT t.name ORDER BY t.name SEPARATOR ',') AS tags
       FROM articles a
       JOIN users u      ON a.author_id   = u.id
       JOIN categories c ON a.category_id = c.id
       LEFT JOIN article_tags at ON a.id = at.article_id
       LEFT JOIN tags t          ON at.tag_id = t.id
       ${where}
       GROUP BY a.id
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const data = articles.map(r => ({ ...r, tags: r.tags ? r.tags.split(',') : [] }));
    return sendPaginated(res, data, { page, limit, total });
  } catch (err) { next(err); }
};

// ────────────────────────────────────────────────────────────
// GET /api/articles/my  — author's own articles
// ────────────────────────────────────────────────────────────
const myArticles = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const { status } = req.query;

    const params = [req.user.id];
    let statusClause = '';
    if (status) { statusClause = 'AND a.status = ?'; params.push(status); }

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM articles a WHERE a.author_id = ? ${statusClause}`, params
    );

    const [articles] = await pool.query(
      `SELECT a.id, a.title, a.slug, a.summary, a.status, a.view_count,
              a.avg_rating, a.version_number, a.published_at, a.created_at, a.updated_at,
              c.name AS category_name
       FROM articles a
       JOIN categories c ON a.category_id = c.id
       WHERE a.author_id = ? ${statusClause}
       ORDER BY a.updated_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return sendPaginated(res, articles, { page, limit, total });
  } catch (err) { next(err); }
};

// ────────────────────────────────────────────────────────────
// GET /api/articles/:id
// ────────────────────────────────────────────────────────────
const getArticle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lookup = isNaN(id) ? 'a.slug = ?' : 'a.id = ?';

    const [rows] = await pool.query(
      `SELECT a.id, a.title, a.slug, a.summary, a.content, a.status, a.visibility,
              a.is_featured, a.view_count, a.avg_rating, a.rating_count,
              a.version_number, a.read_time_minutes, a.published_at,
              a.created_at, a.updated_at,
              u.id AS author_id, CONCAT(u.first_name,' ',u.last_name) AS author_name,
              u.avatar_url AS author_avatar, u.job_title AS author_title,
              c.id AS category_id, c.name AS category_name, c.slug AS category_slug,
              c.color_code AS category_color
       FROM articles a
       JOIN users u      ON a.author_id   = u.id
       JOIN categories c ON a.category_id = c.id
       WHERE ${lookup}`,
      [id]
    );

    if (rows.length === 0) return sendError(res, 'Article not found.', 404);
    const article = rows[0];

    // Permission check: non-published only visible to privileged users or the author
    const role = req.user?.role_name;
    const isPrivileged = ['admin', 'reviewer', 'hr', 'support'].includes(role);
    const isAuthor = req.user?.id === article.author_id;
    if (article.status !== 'published' && !isPrivileged && !isAuthor) {
      return sendError(res, 'Article not found.', 404);
    }

    // Fetch tags
    const [tags] = await pool.query(
      `SELECT t.id, t.name, t.slug, t.color_code
       FROM tags t JOIN article_tags at ON t.id = at.tag_id
       WHERE at.article_id = ?`, [article.id]
    );

    // Fetch attachments
    const [attachments] = await pool.query(
      `SELECT id, original_name, file_type, file_extension, file_size_bytes, download_count, created_at
       FROM attachments WHERE article_id = ?`, [article.id]
    );

    // Increment view count (fire and forget)
    pool.query('UPDATE articles SET view_count = view_count + 1 WHERE id = ?', [article.id]);

    return sendSuccess(res, { article: { ...article, tags, attachments } });
  } catch (err) { next(err); }
};

// ────────────────────────────────────────────────────────────
// POST /api/articles
// ────────────────────────────────────────────────────────────
const createArticle = async (req, res, next) => {
  try {
    const { title, summary, content, category_id, visibility = 'internal', tag_ids = [], is_featured = false } = req.body;

    const baseSlug = slugify(title);
    const slug = await makeUniqueSlug(pool, 'articles', baseSlug);
    const readTime = estimateReadTime(content);

    const [result] = await pool.query(
      `INSERT INTO articles
         (title, slug, summary, content, category_id, author_id,
          status, visibility, is_featured, read_time_minutes)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
      [title, slug, summary || null, content, category_id,
       req.user.id, visibility, is_featured, readTime]
    );

    const articleId = result.insertId;

    // Attach tags
    if (tag_ids.length > 0) {
      const tagValues = tag_ids.map(tid => [articleId, tid]);
      await pool.query('INSERT IGNORE INTO article_tags (article_id, tag_id) VALUES ?', [tagValues]);
      await pool.query(
        'UPDATE tags SET usage_count = usage_count + 1 WHERE id IN (?)', [tag_ids]
      );
    }

    // Save initial version
    await saveVersion(articleId, { title, content, summary, version_number: 1 }, req.user.id, 'Initial draft');

    const [articles] = await pool.query(
      `SELECT a.*, c.name AS category_name FROM articles a
       JOIN categories c ON a.category_id = c.id WHERE a.id = ?`, [articleId]
    );

    return sendCreated(res, { article: articles[0] }, 'Article created successfully.');
  } catch (err) { next(err); }
};

// ────────────────────────────────────────────────────────────
// PUT /api/articles/:id
// ────────────────────────────────────────────────────────────
const updateArticle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, summary, content, category_id, visibility, is_featured, tag_ids, change_note } = req.body;

    const [rows] = await pool.query('SELECT * FROM articles WHERE id = ?', [id]);
    if (rows.length === 0) return sendError(res, 'Article not found.', 404);

    const article = rows[0];
    const role = req.user.role_name;
    const isAdmin = role === 'admin';
    const isOwner = article.author_id === req.user.id;

    if (!isAdmin && !isOwner) return sendError(res, 'Not authorised to edit this article.', 403);
    if (['published', 'archived'].includes(article.status) && !isAdmin) {
      return sendError(res, 'Published or archived articles cannot be edited directly. Please contact an admin.', 403);
    }

    const newVersionNum = article.version_number + 1;
    const readTime = estimateReadTime(content || article.content);

    let newSlug = article.slug;
    if (title && title !== article.title) {
      newSlug = await makeUniqueSlug(pool, 'articles', slugify(title), parseInt(id));
    }

    await pool.query(
      `UPDATE articles
       SET title = ?, slug = ?, summary = ?, content = ?,
           category_id = ?, visibility = ?, is_featured = ?,
           read_time_minutes = ?, version_number = ?, status = 'draft'
       WHERE id = ?`,
      [
        title        ?? article.title,
        newSlug,
        summary      ?? article.summary,
        content      ?? article.content,
        category_id  ?? article.category_id,
        visibility   ?? article.visibility,
        is_featured  ?? article.is_featured,
        readTime,
        newVersionNum,
        id,
      ]
    );

    // Update tags if provided
    if (Array.isArray(tag_ids)) {
      await pool.query('DELETE FROM article_tags WHERE article_id = ?', [id]);
      if (tag_ids.length > 0) {
        const tagValues = tag_ids.map(tid => [id, tid]);
        await pool.query('INSERT IGNORE INTO article_tags (article_id, tag_id) VALUES ?', [tagValues]);
      }
    }

    // Save version snapshot
    await saveVersion(
      id,
      { title: title ?? article.title, content: content ?? article.content,
        summary: summary ?? article.summary, version_number: newVersionNum },
      req.user.id,
      change_note || `Version ${newVersionNum}`
    );

    const [updated] = await pool.query(
      `SELECT a.*, c.name AS category_name FROM articles a
       JOIN categories c ON a.category_id = c.id WHERE a.id = ?`, [id]
    );

    return sendSuccess(res, { article: updated[0] }, 'Article updated successfully.');
  } catch (err) { next(err); }
};

// ────────────────────────────────────────────────────────────
// DELETE /api/articles/:id
// ────────────────────────────────────────────────────────────
const deleteArticle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM articles WHERE id = ?', [id]);
    if (rows.length === 0) return sendError(res, 'Article not found.', 404);

    const article = rows[0];
    const isAdmin = req.user.role_name === 'admin';
    const isOwner = article.author_id === req.user.id;

    if (!isAdmin && !isOwner) return sendError(res, 'Not authorised to delete this article.', 403);
    if (article.status === 'published' && !isAdmin) {
      return sendError(res, 'Published articles can only be deleted by an admin.', 403);
    }

    await pool.query('DELETE FROM articles WHERE id = ?', [id]);
    return sendSuccess(res, null, 'Article deleted successfully.');
  } catch (err) { next(err); }
};

// ────────────────────────────────────────────────────────────
// POST /api/articles/:id/submit  — submit for review
// ────────────────────────────────────────────────────────────
const submitForReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const [rows] = await pool.query('SELECT * FROM articles WHERE id = ?', [id]);
    if (rows.length === 0) return sendError(res, 'Article not found.', 404);

    const article = rows[0];
    if (article.author_id !== req.user.id && req.user.role_name !== 'admin') {
      return sendError(res, 'Not authorised.', 403);
    }
    if (!['draft', 'rejected'].includes(article.status)) {
      return sendError(res, `Cannot submit an article with status "${article.status}".`, 400);
    }

    await pool.query(
      "UPDATE articles SET status = 'pending_review' WHERE id = ?", [id]
    );

    await pool.query(
      `INSERT INTO approval_workflows
         (article_id, submitted_by, status, author_note)
       VALUES (?, ?, 'pending', ?)
       ON DUPLICATE KEY UPDATE
         status = 'pending', author_note = VALUES(author_note),
         submitted_at = NOW(), reviewed_at = NULL, reviewer_id = NULL,
         reviewer_comment = NULL`,
      [id, req.user.id, note || null]
    );

    // Notify all reviewers
    const [reviewers] = await pool.query(
      "SELECT id FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'reviewer') AND is_active = TRUE"
    );
    for (const rv of reviewers) {
      await notify(rv.id, req.user.id, 'article_submitted',
        'Article Pending Review',
        `"${article.title}" has been submitted for review.`,
        `/approval-queue`
      );
    }

    return sendSuccess(res, null, 'Article submitted for review.');
  } catch (err) { next(err); }
};

// ────────────────────────────────────────────────────────────
// POST /api/articles/:id/publish
// ────────────────────────────────────────────────────────────
const publishArticle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM articles WHERE id = ?', [id]);
    if (rows.length === 0) return sendError(res, 'Article not found.', 404);

    const article = rows[0];
    if (!['approved', 'draft'].includes(article.status) && req.user.role_name !== 'admin') {
      return sendError(res, 'Only approved articles can be published.', 400);
    }

    await pool.query(
      "UPDATE articles SET status = 'published', published_at = NOW() WHERE id = ?", [id]
    );

    // Notify the author
    await notify(article.author_id, req.user.id, 'article_published',
      'Article Published',
      `Your article "${article.title}" is now live.`,
      `/articles/${article.slug}`
    );

    return sendSuccess(res, null, 'Article published successfully.');
  } catch (err) { next(err); }
};

// ────────────────────────────────────────────────────────────
// POST /api/articles/:id/archive
// ────────────────────────────────────────────────────────────
const archiveArticle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT id FROM articles WHERE id = ?', [id]);
    if (rows.length === 0) return sendError(res, 'Article not found.', 404);

    await pool.query(
      "UPDATE articles SET status = 'archived', archived_at = NOW() WHERE id = ?", [id]
    );
    return sendSuccess(res, null, 'Article archived.');
  } catch (err) { next(err); }
};

// ────────────────────────────────────────────────────────────
// GET /api/articles/:id/versions
// ────────────────────────────────────────────────────────────
const getVersions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT id FROM articles WHERE id = ?', [id]);
    if (rows.length === 0) return sendError(res, 'Article not found.', 404);

    const [versions] = await pool.query(
      `SELECT av.id, av.version_number, av.title, av.summary, av.change_note, av.created_at,
              CONCAT(u.first_name,' ',u.last_name) AS changed_by_name
       FROM article_versions av
       JOIN users u ON av.changed_by = u.id
       WHERE av.article_id = ?
       ORDER BY av.version_number DESC`,
      [id]
    );
    return sendSuccess(res, { versions });
  } catch (err) { next(err); }
};

module.exports = {
  listArticles, myArticles, getArticle, createArticle,
  updateArticle, deleteArticle, submitForReview,
  publishArticle, archiveArticle, getVersions,
};
