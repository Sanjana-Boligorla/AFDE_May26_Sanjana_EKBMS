const pool = require('../config/db');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');
const { slugify, makeUniqueSlug } = require('../utils/helpers');

// GET /api/tags
const listTags = async (req, res, next) => {
  try {
    const [tags] = await pool.query(
      `SELECT id, name, slug, color_code, usage_count, created_at
       FROM tags ORDER BY usage_count DESC, name ASC`
    );
    return sendSuccess(res, { tags });
  } catch (err) { next(err); }
};

// POST /api/tags
const createTag = async (req, res, next) => {
  try {
    const { name, color_code } = req.body;
    const slug = await makeUniqueSlug(pool, 'tags', slugify(name));
    const [result] = await pool.query(
      'INSERT INTO tags (name, slug, color_code, created_by) VALUES (?, ?, ?, ?)',
      [name, slug, color_code || null, req.user.id]
    );
    const [rows] = await pool.query('SELECT * FROM tags WHERE id = ?', [result.insertId]);
    return sendCreated(res, { tag: rows[0] }, 'Tag created.');
  } catch (err) { next(err); }
};

// PUT /api/tags/:id
const updateTag = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM tags WHERE id = ?', [id]);
    if (rows.length === 0) return sendError(res, 'Tag not found.', 404);

    const { name, color_code } = req.body;
    const tag = rows[0];
    let slug = tag.slug;
    if (name && name !== tag.name) {
      slug = await makeUniqueSlug(pool, 'tags', slugify(name), parseInt(id));
    }
    await pool.query(
      'UPDATE tags SET name=?, slug=?, color_code=? WHERE id=?',
      [name ?? tag.name, slug, color_code ?? tag.color_code, id]
    );
    const [updated] = await pool.query('SELECT * FROM tags WHERE id = ?', [id]);
    return sendSuccess(res, { tag: updated[0] }, 'Tag updated.');
  } catch (err) { next(err); }
};

// DELETE /api/tags/:id
const deleteTag = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM article_tags WHERE tag_id = ?', [id]);
    const [result] = await pool.query('DELETE FROM tags WHERE id = ?', [id]);
    if (result.affectedRows === 0) return sendError(res, 'Tag not found.', 404);
    return sendSuccess(res, null, 'Tag deleted.');
  } catch (err) { next(err); }
};

module.exports = { listTags, createTag, updateTag, deleteTag };
