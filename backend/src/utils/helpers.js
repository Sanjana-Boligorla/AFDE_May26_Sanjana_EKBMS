/**
 * General utility helpers
 */

/**
 * Convert a string to a URL-friendly slug
 */
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

/**
 * Make a slug unique by appending a suffix if needed
 */
const makeUniqueSlug = async (pool, table, baseSlug, excludeId = null) => {
  let slug  = baseSlug;
  let count = 0;
  while (true) {
    const query = excludeId
      ? `SELECT id FROM ${table} WHERE slug = ? AND id != ?`
      : `SELECT id FROM ${table} WHERE slug = ?`;
    const params = excludeId ? [slug, excludeId] : [slug];
    const [rows] = await pool.query(query, params);
    if (rows.length === 0) return slug;
    count++;
    slug = `${baseSlug}-${count}`;
  }
};

/**
 * Parse pagination params from query string
 */
const getPagination = (query) => {
  const page  = Math.max(1, parseInt(query.page)  || 1);
  const limit = Math.min(100, parseInt(query.limit) || 10);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

/**
 * Estimate reading time in minutes
 */
const estimateReadTime = (htmlContent) => {
  const text  = htmlContent.replace(/<[^>]+>/g, '');
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
};

/**
 * Sanitize sort parameter against allowed columns
 */
const sanitizeSort = (value, allowed, defaultSort = 'created_at') => {
  return allowed.includes(value) ? value : defaultSort;
};

module.exports = { slugify, makeUniqueSlug, getPagination, estimateReadTime, sanitizeSort };
