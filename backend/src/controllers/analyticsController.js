/**
 * Analytics Controller
 * All endpoints are admin/reviewer only (enforced in routes).
 *
 * GET /api/analytics/overview          — headline KPIs
 * GET /api/analytics/views             — views over time (daily)
 * GET /api/analytics/top-articles      — most-viewed articles
 * GET /api/analytics/categories        — category activity breakdown
 * GET /api/analytics/search-keywords   — top search terms
 * GET /api/analytics/authors           — author activity report
 * GET /api/analytics/events            — raw event log (paginated)
 * POST /api/analytics/track            — record an event (public)
 * POST /api/analytics/search-track     — record a search query (public)
 */
const pool = require('../config/db');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

// ----------------------------------------------------------------
// GET /api/analytics/overview
// ----------------------------------------------------------------
const getOverview = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);

    const [[totals]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM articles WHERE status = 'published')               AS published_articles,
        (SELECT COUNT(*) FROM articles WHERE status = 'pending_review')          AS pending_review,
        (SELECT COUNT(*) FROM users WHERE is_active = 1)                         AS active_users,
        (SELECT COALESCE(SUM(view_count),0) FROM articles)                       AS total_views,
        (SELECT COUNT(*) FROM analytics_events WHERE created_at >= ?)            AS events_period,
        (SELECT COUNT(*) FROM analytics_events
          WHERE event_type='view' AND created_at >= ?)                           AS views_period,
        (SELECT COUNT(*) FROM search_analytics WHERE created_at >= ?)            AS searches_period,
        (SELECT COUNT(*) FROM articles WHERE created_at >= ?)                    AS new_articles_period
    `, [since, since, since, since]);

    return sendSuccess(res, { overview: totals, period_days: Number(days) });
  } catch (err) { next(err); }
};

// ----------------------------------------------------------------
// GET /api/analytics/views?days=30
// ----------------------------------------------------------------
const getViewsOverTime = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);

    const [rows] = await pool.query(`
      SELECT
        DATE(created_at)    AS date,
        COUNT(*)            AS events,
        COUNT(DISTINCT user_id)  AS unique_users
      FROM analytics_events
      WHERE event_type = 'view' AND created_at >= ?
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [since]);

    // Fill in zero days
    const map = {};
    rows.forEach(r => { map[r.date] = r; });
    const filled = [];
    for (let d = 0; d < Number(days); d++) {
      const dt = new Date(Date.now() - (Number(days) - 1 - d) * 86400000)
        .toISOString().slice(0, 10);
      filled.push(map[dt] || { date: dt, events: 0, unique_users: 0 });
    }

    return sendSuccess(res, { views_over_time: filled, period_days: Number(days) });
  } catch (err) { next(err); }
};

// ----------------------------------------------------------------
// GET /api/analytics/top-articles?limit=10&days=30
// ----------------------------------------------------------------
const getTopArticles = async (req, res, next) => {
  try {
    const { limit = 10, days = 30 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);

    const [rows] = await pool.query(`
      SELECT
        a.id, a.title, a.slug, a.view_count, a.read_time_minutes,
        c.name  AS category_name,
        c.color AS category_color,
        CONCAT(u.first_name,' ',u.last_name) AS author_name,
        COALESCE(AVG(r.rating),0)            AS avg_rating,
        COUNT(DISTINCT ae.id)                AS period_views
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users      u ON a.author_id   = u.id
      LEFT JOIN ratings    r ON r.article_id  = a.id
      LEFT JOIN analytics_events ae
             ON ae.article_id = a.id
            AND ae.event_type = 'view'
            AND ae.created_at >= ?
      WHERE a.status = 'published'
      GROUP BY a.id
      ORDER BY period_views DESC, a.view_count DESC
      LIMIT ?
    `, [since, Number(limit)]);

    return sendSuccess(res, { top_articles: rows, period_days: Number(days) });
  } catch (err) { next(err); }
};

// ----------------------------------------------------------------
// GET /api/analytics/categories?days=30
// ----------------------------------------------------------------
const getCategoryStats = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);

    const [rows] = await pool.query(`
      SELECT
        c.id, c.name, c.color,
        COUNT(DISTINCT a.id)                              AS article_count,
        COALESCE(SUM(a.view_count),0)                     AS total_views,
        COUNT(DISTINCT ae.id)                             AS period_views,
        ROUND(COALESCE(AVG(r.rating),0),1)                AS avg_rating
      FROM categories c
      LEFT JOIN articles a  ON a.category_id = c.id AND a.status = 'published'
      LEFT JOIN analytics_events ae
             ON ae.article_id = a.id
            AND ae.event_type = 'view'
            AND ae.created_at >= ?
      LEFT JOIN ratings r ON r.article_id = a.id
      GROUP BY c.id
      ORDER BY period_views DESC
    `, [since]);

    return sendSuccess(res, { categories: rows, period_days: Number(days) });
  } catch (err) { next(err); }
};

// ----------------------------------------------------------------
// GET /api/analytics/search-keywords?limit=20&days=30
// ----------------------------------------------------------------
const getSearchKeywords = async (req, res, next) => {
  try {
    const { limit = 20, days = 30 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);

    const [rows] = await pool.query(`
      SELECT
        query,
        COUNT(*)                                   AS search_count,
        ROUND(AVG(results_count),1)                AS avg_results,
        COUNT(clicked_article_id)                  AS click_count,
        ROUND(COUNT(clicked_article_id)/COUNT(*)*100,1) AS ctr
      FROM search_analytics
      WHERE created_at >= ? AND LENGTH(query) >= 2
      GROUP BY query
      ORDER BY search_count DESC
      LIMIT ?
    `, [since, Number(limit)]);

    return sendSuccess(res, { keywords: rows, period_days: Number(days) });
  } catch (err) { next(err); }
};

// ----------------------------------------------------------------
// GET /api/analytics/authors?days=30
// ----------------------------------------------------------------
const getAuthorActivity = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);

    const [rows] = await pool.query(`
      SELECT
        u.id,
        CONCAT(u.first_name,' ',u.last_name)  AS author_name,
        u.username,
        COUNT(DISTINCT a.id)                  AS total_articles,
        SUM(CASE WHEN a.status='published' THEN 1 ELSE 0 END) AS published,
        SUM(CASE WHEN a.status='pending_review' THEN 1 ELSE 0 END) AS pending,
        COALESCE(SUM(a.view_count),0)         AS total_views,
        ROUND(COALESCE(AVG(r.rating),0),1)    AS avg_rating,
        COUNT(DISTINCT CASE WHEN a.created_at >= ? THEN a.id END) AS new_articles_period
      FROM users u
      LEFT JOIN articles a ON a.author_id   = u.id
      LEFT JOIN ratings  r ON r.article_id  = a.id
      WHERE u.is_active = 1
      GROUP BY u.id
      HAVING total_articles > 0
      ORDER BY total_views DESC
    `, [since]);

    return sendSuccess(res, { authors: rows, period_days: Number(days) });
  } catch (err) { next(err); }
};

// ----------------------------------------------------------------
// GET /api/analytics/events?page=1&limit=50&type=view
// ----------------------------------------------------------------
const getEvents = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, type, article_id } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params     = [];

    if (type)       { conditions.push('ae.event_type = ?'); params.push(type); }
    if (article_id) { conditions.push('ae.article_id = ?'); params.push(article_id); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM analytics_events ae ${where}`, params
    );
    const [rows] = await pool.query(`
      SELECT
        ae.id, ae.event_type, ae.created_at, ae.time_spent_sec,
        a.title  AS article_title,
        CONCAT(u.first_name,' ',u.last_name) AS user_name
      FROM analytics_events ae
      LEFT JOIN articles a ON ae.article_id = a.id
      LEFT JOIN users    u ON ae.user_id    = u.id
      ${where}
      ORDER BY ae.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, Number(limit), Number(offset)]);

    return sendPaginated(res, rows, { page: Number(page), limit: Number(limit), total });
  } catch (err) { next(err); }
};

// ----------------------------------------------------------------
// POST /api/analytics/track  (called by frontend on article view)
// ----------------------------------------------------------------
const trackEvent = async (req, res, next) => {
  try {
    const { article_id, event_type = 'view', time_spent_sec, referrer } = req.body;
    const userId    = req.user?.id || null;
    const sessionId = req.headers['x-session-id'] || null;
    const ip        = req.ip;
    const ua        = req.headers['user-agent']?.slice(0, 300) || null;

    const allowed = ['view','search_click','bookmark_add','bookmark_remove',
                     'comment_add','rating_submit','download','share','time_on_page'];
    if (!allowed.includes(event_type)) {
      return sendError(res, 'Invalid event_type', 400);
    }

    await pool.query(
      `INSERT INTO analytics_events
         (article_id, event_type, user_id, session_id, referrer,
          time_spent_sec, ip_address, user_agent)
       VALUES (?,?,?,?,?,?,?,?)`,
      [article_id || null, event_type, userId, sessionId,
       referrer || null, time_spent_sec || null, ip, ua]
    );

    return sendSuccess(res, null, 'Event tracked');
  } catch (err) { next(err); }
};

// ----------------------------------------------------------------
// POST /api/analytics/search-track
// ----------------------------------------------------------------
const trackSearch = async (req, res, next) => {
  try {
    const { query, results_count = 0, clicked_article_id,
            category_filter, tag_filter } = req.body;
    const userId    = req.user?.id || null;
    const sessionId = req.headers['x-session-id'] || null;

    if (!query || query.trim().length < 2) {
      return sendSuccess(res, null, 'Query too short — not tracked');
    }

    await pool.query(
      `INSERT INTO search_analytics
         (query, results_count, clicked_article_id, user_id,
          session_id, category_filter, tag_filter)
       VALUES (?,?,?,?,?,?,?)`,
      [query.trim().slice(0, 500), Number(results_count),
       clicked_article_id || null, userId, sessionId,
       category_filter || null, tag_filter || null]
    );

    return sendSuccess(res, null, 'Search tracked');
  } catch (err) { next(err); }
};

module.exports = {
  getOverview, getViewsOverTime, getTopArticles, getCategoryStats,
  getSearchKeywords, getAuthorActivity, getEvents, trackEvent, trackSearch,
};
