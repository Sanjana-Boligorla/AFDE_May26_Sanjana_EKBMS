const pool = require('../config/db');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');

// POST /api/ratings/article/:articleId  — create or update rating
const rateArticle = async (req, res, next) => {
  try {
    const { articleId } = req.params;
    const { rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return sendError(res, 'Rating must be between 1 and 5.', 400);
    }

    const [arts] = await pool.query(
      "SELECT id FROM articles WHERE id = ? AND status = 'published'", [articleId]
    );
    if (arts.length === 0) return sendError(res, 'Article not found.', 404);

    await pool.query(
      `INSERT INTO article_ratings (article_id, user_id, rating, feedback)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), feedback = VALUES(feedback)`,
      [articleId, req.user.id, rating, feedback || null]
    );

    // Recalculate avg on the article
    const [[stats]] = await pool.query(
      'SELECT AVG(rating) AS avg, COUNT(*) AS cnt FROM article_ratings WHERE article_id = ?',
      [articleId]
    );
    await pool.query(
      'UPDATE articles SET avg_rating = ?, rating_count = ? WHERE id = ?',
      [parseFloat(stats.avg).toFixed(2), stats.cnt, articleId]
    );

    return sendCreated(res, { rating, avg_rating: stats.avg }, 'Rating saved.');
  } catch (err) { next(err); }
};

// GET /api/ratings/article/:articleId
const getArticleRatings = async (req, res, next) => {
  try {
    const [[stats]] = await pool.query(
      'SELECT AVG(rating) AS avg_rating, COUNT(*) AS total FROM article_ratings WHERE article_id = ?',
      [req.params.articleId]
    );
    // Distribution
    const [dist] = await pool.query(
      'SELECT rating, COUNT(*) AS count FROM article_ratings WHERE article_id = ? GROUP BY rating',
      [req.params.articleId]
    );

    let userRating = null;
    if (req.user) {
      const [ur] = await pool.query(
        'SELECT rating FROM article_ratings WHERE article_id = ? AND user_id = ?',
        [req.params.articleId, req.user.id]
      );
      if (ur.length > 0) userRating = ur[0].rating;
    }

    return sendSuccess(res, { avg_rating: stats.avg_rating, total: stats.total, distribution: dist, user_rating: userRating });
  } catch (err) { next(err); }
};

module.exports = { rateArticle, getArticleRatings };
