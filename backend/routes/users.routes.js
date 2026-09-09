import express from 'express';
import bcrypt from 'bcrypt';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import {
  authenticateToken,
  canManageUsers,
  canDeleteUsers,
} from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/users - Get all users (admin only)
router.get('/', canManageUsers, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, email, name, role, avatar, vendor_id, created_at, is_active, trust_score
      FROM users
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/stats - Get user statistics (admin only)
router.get('/stats', canManageUsers, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE role = 'superUser') as super_users,
        COUNT(*) FILTER (WHERE role = 'admin') as admins,
        COUNT(*) FILTER (WHERE role = 'vendor') as vendors,
        COUNT(*) FILTER (WHERE role = 'member') as members
      FROM users
    `);

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/role/:role - Get users by role (admin only)
router.get('/role/:role', canManageUsers, async (req, res) => {
  try {
    const { role } = req.params;

    const result = await pool.query(
      `SELECT id, email, name, role, avatar, vendor_id, created_at, is_active, trust_score
       FROM users
       WHERE role = $1
       ORDER BY created_at DESC`,
      [role],
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get users by role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check permissions: user can view their own profile or admins can view any
    if (
      req.user.id !== parseInt(id) &&
      req.user.role !== 'superUser' &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `SELECT id, email, name, role, avatar, vendor_id, created_at, is_active, trust_score
       FROM users
       WHERE id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users - Create new user (admin only)
router.post(
  '/',
  canManageUsers,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('name').notEmpty().withMessage('Name is required'),
    body('role')
      .isIn(['superUser', 'admin', 'vendor', 'member'])
      .withMessage('Invalid role'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name, role, vendorId } = req.body;

      // Check if email already exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
        [email],
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
      const trustScore = role === 'member' ? 0 : null;

      const result = await pool.query(
        `INSERT INTO users (email, password_hash, name, role, avatar, vendor_id, trust_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, name, role, avatar, vendor_id, created_at, is_active, trust_score`,
        [
          email,
          hashedPassword,
          name,
          role,
          avatar,
          vendorId || null,
          trustScore,
        ],
      );

      const newUser = result.rows[0];

      // If member, create trust score entry
      if (role === 'member') {
        await pool.query(
          'INSERT INTO trust_scores (user_id, score) VALUES ($1, 0)',
          [newUser.id],
        );
      }

      res.status(201).json({
        success: true,
        user: newUser,
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// PUT /api/users/:id - Update user
router.put('/:id', canManageUsers, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, vendorId, isActive, trustScore } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (role !== undefined) {
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }
    if (vendorId !== undefined) {
      updates.push(`vendor_id = $${paramCount++}`);
      values.push(vendorId);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(isActive);
    }
    if (trustScore !== undefined) {
      updates.push(`trust_score = $${paramCount++}`);
      values.push(trustScore);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE users 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, email, name, role, avatar, vendor_id, created_at, is_active, trust_score`,
      values,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/users/:id - Delete user (superUser only)
router.delete('/:id', canDeleteUsers, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const userResult = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [id],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting the last superUser
    if (userResult.rows[0].role === 'superUser') {
      const superUserCount = await pool.query(
        "SELECT COUNT(*) as count FROM users WHERE role = 'superUser'",
      );

      if (parseInt(superUserCount.rows[0].count) <= 1) {
        return res
          .status(400)
          .json({ error: 'Cannot delete the last super user' });
      }
    }

    // Delete user
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users/:id/deactivate - Deactivate user (admin only)
router.post('/:id/deactivate', canManageUsers, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE users 
       SET is_active = false
       WHERE id = $1
       RETURNING id, email, name, role, avatar, vendor_id, created_at, is_active, trust_score`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users/:id/activate - Activate user (admin only)
router.post('/:id/activate', canManageUsers, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE users 
       SET is_active = true
       WHERE id = $1
       RETURNING id, email, name, role, avatar, vendor_id, created_at, is_active, trust_score`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
