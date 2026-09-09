import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

// Verify JWT token and attach user to request
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const result = await pool.query(
      'SELECT id, email, name, role, avatar, vendor_id, trust_score, is_active FROM users WHERE id = $1',
      [decoded.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Check if user has required role
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role,
      });
    }

    next();
  };
};

// Check if user can manage other users
export const canManageUsers = (req, res, next) => {
  if (req.user.role === 'superUser' || req.user.role === 'admin') {
    next();
  } else {
    res
      .status(403)
      .json({ error: 'Only superUser and admin can manage users' });
  }
};

// Check if user can delete users
export const canDeleteUsers = (req, res, next) => {
  if (req.user.role === 'superUser') {
    next();
  } else {
    res.status(403).json({ error: 'Only superUser can delete users' });
  }
};

// Check if user is vendor or can access vendor dashboard
export const canAccessVendorDashboard = (req, res, next) => {
  const allowedRoles = ['vendor', 'superUser', 'admin'];
  if (allowedRoles.includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ error: 'Vendor access required' });
  }
};

// Check if user owns the resource or is admin
export const ownsResourceOrAdmin = (userIdField = 'user_id') => {
  return (req, res, next) => {
    const resourceUserId = req.params[userIdField] || req.body[userIdField];

    if (req.user.role === 'superUser' || req.user.role === 'admin') {
      // Admins can access any resource
      next();
    } else if (req.user.id === parseInt(resourceUserId)) {
      // User owns the resource
      next();
    } else {
      res.status(403).json({ error: 'Access denied' });
    }
  };
};
