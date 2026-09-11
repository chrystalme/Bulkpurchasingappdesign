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
    let query = `
      SELECT id, email, name, role, avatar, vendor_id, created_at, is_active, trust_score
      FROM users
    `;
    const params = [];

    // Admin should never see superUser accounts
    if (req.user.role === 'admin') {
      query += " WHERE role != 'superUser'";
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

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
    let query;

    // For admin, do not disclose super_users and exclude them from total/active counts
    if (req.user.role === 'admin') {
      query = `
        SELECT 
          COUNT(*) FILTER (WHERE role != 'superUser') as total,
          COUNT(*) FILTER (WHERE is_active = true AND role != 'superUser') as active,
          0 as super_users,
          COUNT(*) FILTER (WHERE role = 'admin') as admins,
          COUNT(*) FILTER (WHERE role = 'vendor') as vendors,
          COUNT(*) FILTER (WHERE role = 'member') as members
        FROM users
      `;
    } else {
      query = `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_active = true) as active,
          COUNT(*) FILTER (WHERE role = 'superUser') as super_users,
          COUNT(*) FILTER (WHERE role = 'admin') as admins,
          COUNT(*) FILTER (WHERE role = 'vendor') as vendors,
          COUNT(*) FILTER (WHERE role = 'member') as members
        FROM users
      `;
    }

    const result = await pool.query(query);

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

    // Admin cannot query superUser accounts
    if (role === 'superUser' && req.user.role === 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

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
      req.user.id !== id &&
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

    const foundUser = result.rows[0];

    // Admin cannot inspect a superUser account
    if (foundUser.role === 'superUser' && req.user.role === 'admin' && req.user.id !== id) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: foundUser,
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

      // Only superUser can create superUser or admin accounts
      if ((role === 'superUser' || role === 'admin') && req.user.role !== 'superUser') {
        return res.status(403).json({ error: 'Only super users can create admin or super user accounts' });
      }

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
// Admin and superUser may edit accounts they are allowed to manage. Fields:
// name, email, password (optional), role*, vendorId, isActive*, trustScore
// (*superUser only — see the guards below).
router.put('/:id', canManageUsers, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, vendorId, isActive, trustScore } = req.body;

    // Check target user role
    const targetResult = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
    if (targetResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const targetUser = targetResult.rows[0];

    // Admin cannot modify a super user
    if (targetUser.role === 'superUser' && req.user.role !== 'superUser') {
      return res.status(403).json({ error: 'Cannot modify a super user' });
    }

    // Only superUsers may edit a peer admin account. Letting an admin change
    // another admin's email/password would be a privilege-escalation path.
    if (
      targetUser.role === 'admin' &&
      req.user.role !== 'superUser' &&
      req.user.id !== id
    ) {
      return res.status(403).json({ error: 'Only super users can modify admin accounts' });
    }

    // Strict role check: ONLY superUser can activate or deactivate users
    if (isActive !== undefined && req.user.role !== 'superUser') {
      return res.status(403).json({ error: 'Only super users can activate or deactivate users' });
    }

    // Strict role check: ONLY superUser can change user roles
    if (role !== undefined && req.user.role !== 'superUser') {
      return res.status(403).json({ error: 'Only super users can modify user roles' });
    }

    if (role !== undefined && !['superUser', 'admin', 'vendor', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ error: 'Name is required' });
      }
      updates.push(`name = $${paramCount++}`);
      values.push(String(name).trim());
    }

    if (email !== undefined) {
      const normalisedEmail = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalisedEmail)) {
        return res.status(400).json({ error: 'Valid email is required' });
      }
      const emailTaken = await pool.query(
        'SELECT id FROM users WHERE LOWER(email) = $1 AND id != $2',
        [normalisedEmail, id],
      );
      if (emailTaken.rows.length > 0) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      updates.push(`email = $${paramCount++}`);
      values.push(normalisedEmail);
    }

    if (password !== undefined && password !== null && password !== '') {
      if (String(password).length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      updates.push(`password_hash = $${paramCount++}`);
      values.push(await bcrypt.hash(String(password), 10));
    }

    if (role !== undefined) {
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }
    if (vendorId !== undefined) {
      // Empty string clears the vendor link.
      updates.push(`vendor_id = $${paramCount++}`);
      values.push(vendorId === '' ? null : vendorId);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(isActive);
    }
    if (trustScore !== undefined) {
      const parsedTrust = Number(trustScore);
      if (!Number.isFinite(parsedTrust) || parsedTrust < 0 || parsedTrust > 100) {
        return res.status(400).json({ error: 'Trust score must be a number between 0 and 100' });
      }
      updates.push(`trust_score = $${paramCount++}`);
      values.push(parsedTrust);
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

    // Prevent deleting self
    if (req.user.id === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

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

// POST /api/users/:id/deactivate - Deactivate user (superUser only)
router.post('/:id/deactivate', canManageUsers, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'superUser') {
      return res.status(403).json({ error: 'Only super users can deactivate users' });
    }

    if (req.user.id === id) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    // Check target user
    const targetResult = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
    if (targetResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

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

// POST /api/users/:id/activate - Activate user (superUser only)
router.post('/:id/activate', canManageUsers, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'superUser') {
      return res.status(403).json({ error: 'Only super users can activate users' });
    }

    // Check target user
    const targetResult = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
    if (targetResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

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
