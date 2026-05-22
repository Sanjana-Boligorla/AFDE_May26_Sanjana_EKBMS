const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../config/db');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');

/** Generate a signed JWT for the given userId */
const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });

// ─────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { first_name, last_name, email, password, department, employee_id, job_title } = req.body;

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return sendError(res, 'An account with this email already exists.', 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const role_id = 4; // default role: employee

    const [result] = await pool.query(
      `INSERT INTO users
         (first_name, last_name, email, password_hash, role_id, department, employee_id, job_title)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, email, passwordHash, role_id,
       department || null, employee_id || null, job_title || null]
    );

    const [users] = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email,
              u.role_id, r.name AS role_name,
              u.department, u.employee_id, u.job_title, u.created_at
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [result.insertId]
    );

    return sendCreated(res, { user: users[0] }, 'Account created successfully. You can now log in.');
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const [users] = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email,
              u.password_hash, u.role_id, r.name AS role_name,
              u.department, u.employee_id, u.job_title,
              u.avatar_url, u.is_active
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.email = ?`,
      [email]
    );

    if (users.length === 0) {
      return sendError(res, 'Invalid email or password.', 401);
    }

    const user = users[0];

    if (!user.is_active) {
      return sendError(res, 'Your account has been deactivated. Contact the administrator.', 403);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return sendError(res, 'Invalid email or password.', 401);
    }

    const token = generateToken(user.id);

    // Update last login timestamp
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    const { password_hash, ...safeUser } = user;

    return sendSuccess(res, { token, user: safeUser }, 'Login successful.');
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const [users] = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email,
              u.role_id, r.name AS role_name,
              u.department, u.employee_id, u.job_title,
              u.phone, u.avatar_url, u.bio,
              u.last_login_at, u.created_at
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return sendError(res, 'User not found.', 404);
    }

    return sendSuccess(res, { user: users[0] });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/auth/me
// ─────────────────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const { first_name, last_name, phone, bio, job_title } = req.body;

    await pool.query(
      `UPDATE users
       SET first_name = ?, last_name = ?, phone = ?, bio = ?, job_title = ?
       WHERE id = ?`,
      [first_name, last_name, phone || null, bio || null, job_title || null, req.user.id]
    );

    const [users] = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email,
              u.role_id, r.name AS role_name,
              u.department, u.employee_id, u.job_title,
              u.phone, u.avatar_url, u.bio, u.updated_at
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    return sendSuccess(res, { user: users[0] }, 'Profile updated successfully.');
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/auth/change-password
// ─────────────────────────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    const [rows] = await pool.query(
      'SELECT password_hash FROM users WHERE id = ?', [req.user.id]
    );

    const isMatch = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!isMatch) {
      return sendError(res, 'Current password is incorrect.', 400);
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);

    return sendSuccess(res, null, 'Password changed successfully.');
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe, updateProfile, changePassword };
