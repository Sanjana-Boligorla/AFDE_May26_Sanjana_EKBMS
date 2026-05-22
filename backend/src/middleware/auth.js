const jwt  = require('jsonwebtoken');
const pool = require('../config/db');

/**
 * Verifies JWT and attaches user + role to req.user
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const token  = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user from DB on every request
    const [users] = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email,
              u.role_id, r.name AS role_name,
              u.department, u.is_active
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? AND u.is_active = TRUE`,
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found or account deactivated.' });
    }

    req.user = users[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired. Please log in again.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
    next(err);
  }
};

/**
 * Restrict access to specific roles.
 * Usage: authorize('admin', 'reviewer')
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }
  if (!roles.includes(req.user.role_name)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Required role(s): ${roles.join(', ')}.`,
    });
  }
  next();
};

/**
 * Optional auth — attaches user if a valid token is present,
 * but does NOT reject the request if there is no token.
 */
const optionalAuth = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token   = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const [users] = await pool.query(
        `SELECT u.id, u.first_name, u.last_name, u.email,
                u.role_id, r.name AS role_name, u.department
         FROM users u JOIN roles r ON u.role_id = r.id
         WHERE u.id = ? AND u.is_active = TRUE`,
        [decoded.userId]
      );
      if (users.length > 0) req.user = users[0];
    }
  } catch {
    // Ignore auth errors on optional routes
  }
  next();
};

module.exports = { protect, authorize, optionalAuth };
