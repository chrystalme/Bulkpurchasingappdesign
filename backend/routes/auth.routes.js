import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import {
  loginLimiter,
  signupLimiter,
  passwordResetLimiter,
} from '../middleware/rateLimit.js';
import {
  loginValidationRules,
  signupValidationRules,
  passwordChangeValidationRules,
  validateRequest,
  logValidationAttempts,
} from '../middleware/validation.js';

const router = express.Router();

// Helper function to store refresh token
const storeRefreshToken = async (userId, refreshToken, req) => {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  try {
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, created_at, expires_at, ip_address, user_agent)
       VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5)`,
      [userId, refreshToken, expiresAt, req.ip, req.get('user-agent')],
    );
  } catch (error) {
    console.error('Error storing refresh token:', error);
    // Don't throw - continue anyway
  }
};

// Helper function to generate tokens
const generateTokens = user => {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }, // Access token: 15 minutes
  );

  const refreshToken = jwt.sign(
    { userId: user.id, tokenType: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }, // Refresh token: 7 days
  );

  return { accessToken, refreshToken };
};

// POST /api/auth/login
router.post(
  '/login',
  loginLimiter,
  loginValidationRules(),
  logValidationAttempts,
  validateRequest,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user by email
      const result = await pool.query(
        'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
        [email],
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
      }

      const user = result.rows[0];

      // Check if account is active
      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          error: 'Account is deactivated',
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(
        password,
        user.password_hash,
      );

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
      }

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user);

      // Store refresh token
      await storeRefreshToken(user.id, refreshToken, req);

      // Remove password from response
      const { password_hash, ...userWithoutPassword } = user;

      res.json({
        success: true,
        accessToken,
        refreshToken,
        user: userWithoutPassword,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  },
);

// POST /api/auth/signup
router.post(
  '/signup',
  // signupLimiter,
  signupValidationRules(),
  logValidationAttempts,
  validateRequest,
  async (req, res) => {
    try {
      const { email, password, name, role = 'member' } = req.body;

      // Check if email already exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
        [email],
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Email already exists',
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
      const trustScore = role === 'member' ? 0 : null;

      const result = await pool.query(
        `INSERT INTO users (email, password_hash, name, role, avatar, trust_score)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, name, role, avatar, vendor_id, trust_score, created_at, is_active`,
        [email, hashedPassword, name, role, avatar, trustScore],
      );

      const newUser = result.rows[0];

      // If member, create trust score entry
      if (role === 'member') {
        await pool.query(
          'INSERT INTO trust_scores (user_id, score) VALUES ($1, 0)',
          [newUser.id],
        );
      }

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(newUser);

      // Store refresh token
      await storeRefreshToken(newUser.id, refreshToken, req);

      res.status(201).json({
        success: true,
        accessToken,
        refreshToken,
        user: newUser,
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  },
);

// GET /api/auth/me - Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// POST /api/auth/refresh - Refresh token with rotation
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token required',
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired refresh token',
      });
    }

    // Check if token is in database and not revoked
    const tokenRecord = await pool.query(
      `SELECT * FROM refresh_tokens 
       WHERE token = $1 AND user_id = $2 AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP`,
      [refreshToken, decoded.userId],
    );

    if (tokenRecord.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Refresh token not found or revoked',
      });
    }

    // Get user
    const userResult = await pool.query(
      'SELECT id, email, role FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const user = userResult.rows[0];

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    // Revoke old token
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP, revoked_reason = 'rotated' 
       WHERE token = $1`,
      [refreshToken],
    );

    // Store new refresh token
    await storeRefreshToken(user.id, newRefreshToken, req);

    res.json({
      success: true,
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// POST /api/auth/logout - Revoke refresh token
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Revoke the refresh token
      await pool.query(
        `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP, revoked_reason = 'logout' 
         WHERE token = $1 AND user_id = $2`,
        [refreshToken, req.user.id],
      );
    }

    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// POST /api/auth/change-password
router.post(
  '/change-password',
  authenticateToken,
  passwordResetLimiter,
  passwordChangeValidationRules(),
  validateRequest,
  async (req, res) => {
    try {
      const { currentPassword, password } = req.body;
      const userId = req.user.id;

      // Get user's current password hash
      const userResult = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId],
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(
        currentPassword,
        userResult.rows[0].password_hash,
      );

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Current password is incorrect',
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update password
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
        hashedPassword,
        userId,
      ]);

      // Revoke all refresh tokens (force re-login)
      await pool.query(
        `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP, revoked_reason = 'password_changed' 
         WHERE user_id = $1`,
        [userId],
      );

      res.json({
        success: true,
        message: 'Password changed successfully. Please login again.',
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  },
);

export default router;
