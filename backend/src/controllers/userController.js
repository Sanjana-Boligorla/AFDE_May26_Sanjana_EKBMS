const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');
const { getPagination } = require('../utils/helpers');

// GET /api/users  (admin)
const listUsers = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const { role_id, department, is_active, q } = req.query;

    const whereClauses = [];
    const params = [];

    if (role_id)    { whereClauses.push('u.role_id = ?');       params.push(role_id); }
    if (department) { whereClauses.push('u.department LIKE ?'); params.push(`%${department}%`); }
    if (is_active !== undefined) { whereClauses.push('u.is_active = ?'); params.push(is_active === 'true'); }
    if (q) {
      whereClauses.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const where = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM users u ${where}`, params);

    const [users] = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email,
              u.role_id, r.name AS role_name,
              u.department, u.employee_id, u.job_title,
              u.is_active, u.last_login_at, u.created_at
       FROM users u JOIN roles r ON u.role_id = r.id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return sendSuccess(res, { users, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } });
  } catch (err) { next(err); }
};

// GET /api/users/:id
const getUser = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email,
              u.role_id, r.name AS role_name,
              u.department, u.employee_id, u.job_title,
              u.phone, u.avatar_url, u.bio,
              u.is_active, u.last_login_at, u.created_at
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return sendError(res, 'User not found.', 404);
    return sendSuccess(res, { user: rows[0] });
  } catch (err) { next(err); }
};

// POST /api/users  (admin creates user with specific role)
const createUser = async (req, res, next) => {
  try {
    const { first_name, last_name, email, password, role_id, department, employee_id, job_title } = req.body;

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return sendError(res, 'Email already in use.', 409);

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role_id, department, employee_id, job_title)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, email, hash, role_id, department || null, employee_id || null, job_title || null]
    );
    const [rows] = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, r.name AS role_name, u.department
       FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
      [result.insertId]
    );
    return sendCreated(res, { user: rows[0] }, 'User created.');
  } catch (err) { next(err); }
};

// PUT /api/users/:id/role  (admin)
const updateUserRole = async (req, res, next) => {
  try {
    const { role_id } = req.body;
    const [roles] = await pool.query('SELECT id FROM roles WHERE id = ?', [role_id]);
    if (roles.length === 0) return sendError(res, 'Invalid role.', 400);

    await pool.query('UPDATE users SET role_id = ? WHERE id = ?', [role_id, req.params.id]);
    return sendSuccess(res, null, 'User role updated.');
  } catch (err) { next(err); }
};

// PUT /api/users/:id/toggle  (admin activate/deactivate)
const toggleUserStatus = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, is_active FROM users WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return sendError(res, 'User not found.', 404);
    if (rows[0].id === req.user.id) return sendError(res, 'Cannot deactivate your own account.', 400);

    const newStatus = !rows[0].is_active;
    await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, req.params.id]);
    return sendSuccess(res, { is_active: newStatus }, `User ${newStatus ? 'activated' : 'deactivated'}.`);
  } catch (err) { next(err); }
};

// GET /api/users/roles  — list all roles
const listRoles = async (_req, res, next) => {
  try {
    const [roles] = await pool.query('SELECT * FROM roles ORDER BY id');
    return sendSuccess(res, { roles });
  } catch (err) { next(err); }
};


// PUT /api/users/:id  (admin update user details, role, active status)
const updateUser = async (req, res, next) => {
  try {
    const { role_id, is_active, department, job_title } = req.body;
    const [rows] = await pool.query('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return sendError(res, 'User not found.', 404);

    const updates = [];
    const values = [];
    if (role_id !== undefined)    { updates.push('role_id = ?');    values.push(Number(role_id)); }
    if (is_active !== undefined)  { updates.push('is_active = ?');  values.push(Boolean(is_active)); }
    if (department !== undefined) { updates.push('department = ?'); values.push(department || null); }
    if (job_title !== undefined)  { updates.push('job_title = ?');  values.push(job_title || null); }

    if (updates.length === 0) return sendError(res, 'No fields to update.', 400);
    values.push(req.params.id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    return sendSuccess(res, null, 'User updated.');
  } catch (err) { next(err); }
};

module.exports = { listUsers, getUser, createUser, updateUser, updateUserRole, toggleUserStatus, listRoles };
