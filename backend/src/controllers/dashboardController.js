const pool = require('../config/db');
const { sendSuccess } = require('../utils/response');

// GET /api/dashboard/stats
const getStats = async (req, res, next) => {
  try {
    const [[articleStats]] = await pool.query(
      `SELECT
         COUNT(*)                                              AS total_articles,
         SUM(status = 'published')                            AS published,
         SUM(status = 'draft')                                AS drafts,
         SUM(status = 'pending_review')                       AS pending_review,
         SUM(status = 'approved')                             AS approved,
         SUM(status = 'rejected')                             AS rejected,
         SUM(status = 'archived')                             AS archived
       FROM articles`
    );

    const [[userStats]] = await pool.query(
      `SELECT
         COUNT(*)                   AS total_users,
         SUM(is_active = TRUE)      AS active_users,
         SUM(r.name = 'author')     AS authors,
         SUM(r.name = 'reviewer')   AS reviewers
       FROM users u JOIN roles r ON u.role_id = r.id`
    );

    const [[categoryStats]] = await pool.query(
      'SELECT COUNT(*) AS total_categories FROM categories WHERE is_active = TRUE'
    );

    const [[tagStats]] = await pool.query('SELECT COUNT(*) AS total_tags FROM tags');

    const [[commentStats]] = await pool.query(
      'SELECT COUNT(*) AS total_comments FROM comments WHERE is_approved = TRUE'
    );

    return sendSuccess(res, {
      articles: articleStats,
      users: userStats,
      categories: categoryStats,
      tags: tagStats,
      comments: commentStats,
    });
  } catch (err) { next(err); }
};

// GET /api/dashboard/popular  — top 10 viewed articles
const getPopularArticles = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.title, a.slug, a.view_count, a.avg_rating,
              a.published_at, a.read_time_minutes,
              c.name AS category_name, c.color_code AS category_color,
              CONCAT(u.first_name,' ',u.last_name) AS author_name
       FROM articles a
       JOIN categories c ON a.category_id = c.id
       JOIN users u      ON a.author_id   = u.id
       WHERE a.status = 'published'
       ORDER BY a.view_count DESC LIMIT 10`
    );
    return sendSuccess(res, { articles: rows });
  } catch (err) { next(err); }
};

// GET /api/dashboard/recent  — 10 most recently published
const getRecentArticles = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.title, a.slug, a.summary, a.status,
              a.view_count, a.avg_rating, a.published_at, a.created_at,
              c.name AS category_name, c.color_code AS category_color,
              CONCAT(u.first_name,' ',u.last_name) AS author_name
       FROM articles a
       JOIN categories c ON a.category_id = c.id
       JOIN users u      ON a.author_id   = u.id
       WHERE a.status = 'published'
       ORDER BY a.published_at DESC LIMIT 10`
    );
    return sendSuccess(res, { articles: rows });
  } catch (err) { next(err); }
};

// GET /api/dashboard/pending  — articles needing review
const getPendingApprovals = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT aw.id AS workflow_id, aw.status AS workflow_status,
              aw.submitted_at, aw.author_note,
              a.id AS article_id, a.title, a.slug,
              CONCAT(u.first_name,' ',u.last_name) AS author_name,
              u.department
       FROM approval_workflows aw
       JOIN articles a ON aw.article_id = a.id
       JOIN users u    ON aw.submitted_by = u.id
       WHERE aw.status IN ('pending','under_review')
       ORDER BY aw.submitted_at ASC`
    );
    return sendSuccess(res, { pending: rows });
  } catch (err) { next(err); }
};

// GET /api/dashboard/category-stats  — article count by category
const getCategoryStats = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.name, c.color_code, c.icon,
              COUNT(a.id) AS total_articles,
              SUM(a.status = 'published') AS published_articles
       FROM categories c
       LEFT JOIN articles a ON c.id = a.category_id
       WHERE c.is_active = TRUE AND c.parent_id IS NULL
       GROUP BY c.id
       ORDER BY total_articles DESC`
    );
    return sendSuccess(res, { categories: rows });
  } catch (err) { next(err); }
};

module.exports = { getStats, getPopularArticles, getRecentArticles, getPendingApprovals, getCategoryStats };
