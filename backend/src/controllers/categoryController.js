const pool = require('../config/db');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');
const { slugify, makeUniqueSlug } = require('../utils/helpers');

// GET /api/categories  — tree structure
const listCategories = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.name, c.slug, c.description, c.parent_id,
              c.icon, c.color_code, c.sort_order, c.is_active,
              CONCAT(u.first_name,' ',u.last_name) AS created_by_name,
              (SELECT COUNT(*) FROM articles a
               WHERE a.category_id = c.id AND a.status = 'published') AS article_count
       FROM categories c
       JOIN users u ON c.created_by = u.id
       WHERE c.is_active = TRUE
       ORDER BY c.sort_order, c.name`
    );

    // Build tree: top-level with children nested
    const map = {};
    rows.forEach(r => { map[r.id] = { ...r, children: [] }; });
    const tree = [];
    rows.forEach(r => {
      if (r.parent_id && map[r.parent_id]) {
        map[r.parent_id].children.push(map[r.id]);
      } else {
        tree.push(map[r.id]);
      }
    });

    return sendSuccess(res, { categories: tree, flat: rows });
  } catch (err) { next(err); }
};

// GET /api/categories/:id
const getCategory = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, CONCAT(u.first_name,' ',u.last_name) AS created_by_name
       FROM categories c JOIN users u ON c.created_by = u.id WHERE c.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return sendError(res, 'Category not found.', 404);
    return sendSuccess(res, { category: rows[0] });
  } catch (err) { next(err); }
};

// POST /api/categories
const createCategory = async (req, res, next) => {
  try {
    const { name, description, parent_id, icon, color_code, sort_order } = req.body;
    const slug = await makeUniqueSlug(pool, 'categories', slugify(name));

    const [result] = await pool.query(
      `INSERT INTO categories (name, slug, description, parent_id, icon, color_code, sort_order, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, slug, description || null, parent_id || null,
       icon || null, color_code || null, sort_order || 0, req.user.id]
    );
    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
    return sendCreated(res, { category: rows[0] }, 'Category created.');
  } catch (err) { next(err); }
};

// PUT /api/categories/:id
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
    if (rows.length === 0) return sendError(res, 'Category not found.', 404);

    const { name, description, parent_id, icon, color_code, sort_order, is_active } = req.body;
    const cat = rows[0];

    let slug = cat.slug;
    if (name && name !== cat.name) {
      slug = await makeUniqueSlug(pool, 'categories', slugify(name), parseInt(id));
    }

    await pool.query(
      `UPDATE categories
       SET name=?, slug=?, description=?, parent_id=?, icon=?, color_code=?, sort_order=?, is_active=?
       WHERE id=?`,
      [name ?? cat.name, slug, description ?? cat.description,
       parent_id ?? cat.parent_id, icon ?? cat.icon,
       color_code ?? cat.color_code, sort_order ?? cat.sort_order,
       is_active ?? cat.is_active, id]
    );
    const [updated] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
    return sendSuccess(res, { category: updated[0] }, 'Category updated.');
  } catch (err) { next(err); }
};

// DELETE /api/categories/:id
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [[{ count }]] = await pool.query(
      'SELECT COUNT(*) AS count FROM articles WHERE category_id = ?', [id]
    );
    if (count > 0) {
      return sendError(res, `Cannot delete — ${count} article(s) use this category. Reassign them first.`, 409);
    }
    const [result] = await pool.query('DELETE FROM categories WHERE id = ?', [id]);
    if (result.affectedRows === 0) return sendError(res, 'Category not found.', 404);
    return sendSuccess(res, null, 'Category deleted.');
  } catch (err) { next(err); }
};

module.exports = { listCategories, getCategory, createCategory, updateCategory, deleteCategory };
