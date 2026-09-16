const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const db = require('../database/db');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await db.get(
      `SELECT u.id, u.email, u.mobile, u.role, u.is_active, u.is_verified, u.avatar_url,
              u.two_factor_enabled, u.two_factor_secret
       FROM users u WHERE u.id = ?`,
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({ error: 'User account no longer exists.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account has been deactivated or suspended.' });
    }

    // Attach role-specific IDs
    let roleProfile = null;
    if (user.role === 'customer') {
      roleProfile = await db.get('SELECT id, full_name, is_suspended, suspension_reason FROM customers WHERE user_id = ?', [user.id]);
      if (roleProfile && roleProfile.is_suspended) {
        return res.status(403).json({
          error: `Account suspended: ${roleProfile.suspension_reason || 'Please contact customer support.'}`,
          is_suspended: true
        });
      }
    } else if (user.role === 'worker') {
      roleProfile = await db.get('SELECT id, full_name, is_approved, verification_status, is_online FROM workers WHERE user_id = ?', [user.id]);
    } else if (user.role === 'admin') {
      roleProfile = await db.get('SELECT id, full_name, department FROM admins WHERE user_id = ?', [user.id]);
    }

    req.user = {
      ...user,
      profile: roleProfile
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access forbidden. Required role: [${allowedRoles.join(', ')}]. Your role is: ${req.user ? req.user.role : 'none'}`
      });
    }
    next();
  };
}

module.exports = {
  authenticate,
  authorize
};
