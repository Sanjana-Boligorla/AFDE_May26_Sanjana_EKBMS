/**
 * Article Transformer
 * Cleans and normalises a raw extracted row into a shape ready
 * for the database loader.
 *
 * Input (raw row from CSV or JSON):
 *   { title, category, tags, author_name, author_username,
 *     status, view_count, avg_rating, read_time_minutes,
 *     summary, content, published_at }
 *
 * Output (clean article object):
 *   { title, slug, summary, content, status,
 *     view_count, read_time_minutes, published_at,
 *     _category: string, _tags: string[],
 *     _author_name: string, _author_username: string }
 */

const ALLOWED_STATUSES = new Set([
  'draft', 'pending_review', 'approved', 'published', 'rejected', 'archived'
]);

/**
 * Turn a title into a URL slug.
 * e.g. "Setting Up a Secure VPN" -> "setting-up-a-secure-vpn"
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/--+/g, '-')
    .slice(0, 200);
}

/**
 * @param {object} raw    A single extracted row
 * @param {object} logger
 * @param {number} rowNum Row index for logging
 * @returns {{ ok: boolean, data?: object, error?: string }}
 */
function transformArticle(raw, logger, rowNum) {
  // ---------- Required fields ----------
  const title = (raw.title || '').trim();
  if (!title) {
    return { ok: false, error: 'Missing title' };
  }

  const category = (raw.category || '').trim();
  if (!category) {
    return { ok: false, error: `Row ${rowNum}: Missing category for "${title}"` };
  }

  // ---------- Status ----------
  const rawStatus = (raw.status || 'draft').trim().toLowerCase();
  const status    = ALLOWED_STATUSES.has(rawStatus) ? rawStatus : 'draft';
  if (!ALLOWED_STATUSES.has(rawStatus)) {
    logger.log('warn', `Row ${rowNum}: Unknown status "${rawStatus}" — defaulting to draft`);
  }

  // ---------- Numeric fields ----------
  const viewCount    = Math.max(0, parseInt(raw.view_count, 10) || 0);
  const readTime     = Math.max(1, parseInt(raw.read_time_minutes, 10) || 5);

  // ---------- Published date ----------
  let publishedAt = null;
  if (raw.published_at) {
    const d = new Date(raw.published_at);
    publishedAt = isNaN(d.getTime()) ? null : d.toISOString().slice(0, 19).replace('T', ' ');
  }
  if (status === 'published' && !publishedAt) {
    publishedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
  }

  // ---------- Tags (comma-separated string -> array) ----------
  const tags = (raw.tags || '')
    .split(',')
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);

  // ---------- Author ----------
  const authorName     = (raw.author_name     || 'Unknown Author').trim();
  const authorUsername = (raw.author_username || slugify(authorName)).trim();

  // ---------- Content ----------
  const summary = (raw.summary || '').trim().slice(0, 1000);
  const content = (raw.content || `<p>${summary}</p>`).trim();

  // ---------- Slug (make unique later in loader) ----------
  const slug = slugify(title);

  return {
    ok:   true,
    data: {
      title,
      slug,
      summary,
      content,
      status,
      view_count:          viewCount,
      read_time_minutes:   readTime,
      published_at:        publishedAt,
      _category:           category,
      _tags:               tags,
      _author_name:        authorName,
      _author_username:    authorUsername,
    },
  };
}

module.exports = { transformArticle, slugify };
