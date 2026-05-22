/**
 * DB Loader
 * Upserts transformed article objects into the database.
 * Handles: users (authors), categories, articles, tags, article_tags.
 *
 * Strategy: skip-on-duplicate (idempotent runs).
 */
const pool             = require('../../config/db');
const { resolveCategory } = require('../transformers/categoryMapper');
const { slugify }      = require('../transformers/articleTransformer');
const bcrypt           = require('bcryptjs');

// Cache for tag ids: "tag name" -> id
const _tagCache = {};

async function resolveTag(name, logger) {
  const key = name.toLowerCase().trim();
  if (_tagCache[key]) return _tagCache[key];

  const [rows] = await pool.query(
    'SELECT id FROM tags WHERE LOWER(name) = ? LIMIT 1',
    [key]
  );
  if (rows.length) {
    _tagCache[key] = rows[0].id;
    return rows[0].id;
  }

  logger.log('info', `Tag: creating "${name}"`);
  const [r] = await pool.query(
    'INSERT INTO tags (name, slug) VALUES (?, ?)',
    [key, slugify(key)]
  );
  _tagCache[key] = r.insertId;
  return r.insertId;
}

// Cache for author ids: "username" -> id
const _authorCache = {};

async function resolveAuthor(name, username, logger) {
  const key   = username.toLowerCase();
  const email = `${key}@ekbms.internal`;
  if (_authorCache[key]) return _authorCache[key];

  const [rows] = await pool.query(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [email]
  );
  if (rows.length) {
    _authorCache[key] = rows[0].id;
    return rows[0].id;
  }

  // Look up "author" role id
  const [roleRows] = await pool.query(
    "SELECT id FROM roles WHERE name = 'author' LIMIT 1"
  );
  const roleId = roleRows[0]?.id || 3;

  logger.log('info', `Author: creating user "${username}"`);
  const parts     = name.split(' ');
  const firstName = parts[0] || 'Author';
  const lastName  = parts[1] || 'User';
  const hash      = await bcrypt.hash('ETL@pass123', 10);

  const [r] = await pool.query(
    `INSERT INTO users (first_name, last_name, email, password_hash, role_id, is_active)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [firstName, lastName, email, hash, roleId]
  );
  _authorCache[key] = r.insertId;
  return r.insertId;
}

/**
 * Load a single transformed article into the DB.
 * Returns { inserted: bool, articleId: number|null, error: string|null }
 */
async function loadArticle(article, logger) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Resolve category
    const categoryId = await resolveCategory(article._category, logger);

    // 2. Resolve author
    const authorId = await resolveAuthor(
      article._author_name,
      article._author_username,
      logger
    );

    // 3. Ensure slug is unique
    let slug = article.slug;
    const [existing] = await conn.query(
      'SELECT id FROM articles WHERE slug = ? LIMIT 1',
      [slug]
    );
    if (existing.length) {
      // Article already imported — skip
      await conn.rollback();
      return { inserted: false, articleId: existing[0].id, error: null };
    }

    // 4. Insert article
    const [result] = await conn.query(
      `INSERT INTO articles
         (title, slug, summary, content, status, category_id, author_id,
          view_count, read_time_minutes, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        article.title,
        slug,
        article.summary,
        article.content,
        article.status,
        categoryId,
        authorId,
        article.view_count,
        article.read_time_minutes,
        article.published_at,
      ]
    );
    const articleId = result.insertId;

    // 5. Resolve and attach tags
    for (const tagName of article._tags) {
      const tagId = await resolveTag(tagName, logger);
      await conn.query(
        'INSERT IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)',
        [articleId, tagId]
      );
    }

    await conn.commit();
    return { inserted: true, articleId, error: null };

  } catch (err) {
    await conn.rollback();
    return { inserted: false, articleId: null, error: err.message };
  } finally {
    conn.release();
  }
}

function clearCaches() {
  Object.keys(_tagCache).forEach(k => delete _tagCache[k]);
  Object.keys(_authorCache).forEach(k => delete _authorCache[k]);
}

module.exports = { loadArticle, clearCaches };
