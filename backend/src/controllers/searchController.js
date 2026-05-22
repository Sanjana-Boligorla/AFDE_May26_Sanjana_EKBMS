const pool = require('../config/db');
const { sendSuccess } = require('../utils/response');
const { getPagination } = require('../utils/helpers');

// GET /api/search?q=&category_id=&tag_id=&author_id=&sort=&status=
const search = async (req, res, next) => {
  try {
    const { q, category_id, tag_id, author_id, sort } = req.query;
    const { page, limit, offset } = getPagination(req.query);

    if (!q || q.trim().length < 2) {
      return sendSuccess(res, { articles: [], pagination: { page, limit, total: 0, totalPages: 0 } });
    }

    const searchTerm = q.trim();
    const whereClauses = ["a.status = 'published'"];
    const params = [];

    // Full-text match using MATCH ... AGAINST
    whereClauses.push('MATCH(a.title, a.content, a.summary) AGAINST (? IN BOOLEAN MODE)');
    params.push(`${searchTerm}*`);

    if (category_id) { whereClauses.push('a.category_id = ?'); params.push(category_id); }
    if (author_id)   { whereClauses.push('a.author_id = ?');   params.push(author_id); }
    if (tag_id) {
      whereClauses.push('EXISTS (SELECT 1 FROM article_tags at2 WHERE at2.article_id = a.id AND at2.tag_id = ?)');
      params.push(tag_id);
    }

    const where = 'WHERE ' + whereClauses.join(' AND ');

    const sortMap = {
      relevance: 'MATCH(a.title, a.content, a.summary) AGAINST (? IN BOOLEAN MODE) DESC',
      latest:    'a.published_at DESC',
      popular:   'a.view_count DESC',
      rating:    'a.avg_rating DESC',
    };
    let orderBy = 'a.view_count DESC';
    const orderParams = [...params, limit, offset];
    if (sort === 'relevance') {
      orderBy = `MATCH(a.title, a.content, a.summary) AGAINST (? IN BOOLEAN MODE) DESC`;
      orderParams.unshift(`${searchTerm}*`);
    } else if (sortMap[sort]) {
      orderBy = sortMap[sort];
    }

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM articles a ${where}`, params
    );

    const [articles] = await pool.query(
      `SELECT a.id, a.title, a.slug, a.summary, a.status,
              a.view_count, a.avg_rating, a.rating_count,
              a.read_time_minutes, a.published_at,
              CONCAT(u.first_name,' ',u.last_name) AS author_name,
              c.name AS category_name, c.color_code AS category_color,
              GROUP_CONCAT(DISTINCT t.name SEPARATOR ',') AS tags
       FROM articles a
       JOIN users u      ON a.author_id   = u.id
       JOIN categories c ON a.category_id = c.id
       LEFT JOIN article_tags at ON a.id  = at.article_id
       LEFT JOIN tags t          ON at.tag_id = t.id
       ${where}
       GROUP BY a.id
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      orderParams
    );

    const data = articles.map(r => ({ ...r, tags: r.tags ? r.tags.split(',') : [] }));

    // Track search query (fire-and-forget)
    pool.query(
      `INSERT INTO search_analytics (query, results_count, user_id, session_id, category_filter, tag_filter)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [searchTerm, total, req.user?.id || null,
       req.headers['x-session-id'] || null,
       category_id || null, tag_id || null]
    ).catch(() => {});

    return sendSuccess(res, {
      query: searchTerm,
      articles: data,
      pagination: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) { next(err); }
};

// GET /api/search/suggestions?q=
const suggestions = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return sendSuccess(res, { suggestions: [] });

    const [rows] = await pool.query(
      `SELECT id, title, slug FROM articles
       WHERE status = 'published' AND title LIKE ?
       ORDER BY view_count DESC LIMIT 8`,
      [`%${q.trim()}%`]
    );
    return sendSuccess(res, { suggestions: rows });
  } catch (err) { next(err); }
};

module.exports = { search, suggestions };
