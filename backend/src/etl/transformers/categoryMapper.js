/**
 * Category Mapper
 * Given a category name string, resolves (or creates) the matching
 * row in the `categories` table and returns its id.
 *
 * Results are cached in-memory for the duration of a job run.
 */
const pool    = require('../../config/db');
const { slugify } = require('./articleTransformer');

// In-memory cache: "category name (lower)" -> id
const _cache = {};

/**
 * @param {string} categoryName
 * @param {object} logger
 * @returns {Promise<number>} category id
 */
async function resolveCategory(categoryName, logger) {
  const key = categoryName.toLowerCase().trim();

  if (_cache[key]) return _cache[key];

  // Try to find existing category (case-insensitive)
  const [rows] = await pool.query(
    'SELECT id FROM categories WHERE LOWER(name) = ? LIMIT 1',
    [key]
  );

  if (rows.length > 0) {
    _cache[key] = rows[0].id;
    return rows[0].id;
  }

  // Create new category
  logger.log('info', `Category mapper: creating new category "${categoryName}"`);
  const slug = slugify(categoryName);

  const [result] = await pool.query(
    `INSERT INTO categories (name, slug, description, color_code, created_by)
     VALUES (?, ?, ?, ?, 1)`,
    [categoryName, slug, `Articles related to ${categoryName}`, '#6366f1']
  );

  _cache[key] = result.insertId;
  return result.insertId;
}

function clearCache() {
  Object.keys(_cache).forEach(k => delete _cache[k]);
}

module.exports = { resolveCategory, clearCache };
