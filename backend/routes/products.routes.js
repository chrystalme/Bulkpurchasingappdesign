import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../config/database.js';
import {
  authenticateToken,
  canAccessVendorDashboard,
} from '../middleware/auth.js';

const router = express.Router();

// GET /api/products - Get all products (public or authenticated)
router.get('/', async (req, res) => {
  try {
    const { category, vendor_id, is_active } = req.query;

    let query = `
      SELECT p.*, v.name as vendor_name, v.rating as vendor_rating, v.verified as vendor_verified
      FROM products p
      LEFT JOIN vendors v ON p.vendor_id = v.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (category) {
      query += ` AND p.category = $${paramCount++}`;
      params.push(category);
    }

    if (vendor_id) {
      query += ` AND p.vendor_id = $${paramCount++}`;
      params.push(vendor_id);
    }

    if (is_active !== undefined) {
      query += ` AND p.is_active = $${paramCount++}`;
      params.push(is_active === 'true');
    } else {
      // By default, only show active products
      query += ` AND p.is_active = true`;
    }

    query += ' ORDER BY p.created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/products/categories - Get all categories
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT category
      FROM products
      WHERE category IS NOT NULL AND is_active = true
      ORDER BY category
    `);

    res.json({
      success: true,
      data: result.rows.map(row => row.category),
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/products/:id - Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT p.*, v.name as vendor_name, v.rating as vendor_rating, v.verified as vendor_verified, v.location as vendor_location
      FROM products p
      LEFT JOIN vendors v ON p.vendor_id = v.id
      WHERE p.id = $1
    `,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/products - Create new product (vendor only)
router.post(
  '/',
  authenticateToken,
  canAccessVendorDashboard,
  [
    body('name').notEmpty().withMessage('Product name is required'),
    body('bulk_price')
      .isFloat({ min: 0 })
      .withMessage('Valid bulk price is required'),
    body('retail_price')
      .isFloat({ min: 0 })
      .withMessage('Valid retail price is required'),
    body('moq').isInt({ min: 1 }).withMessage('Valid MOQ is required'),
    body('vendor_id').isInt().withMessage('Valid vendor ID is required'),
    body('category').notEmpty().withMessage('Category is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        name,
        image,
        bulk_price,
        retail_price,
        moq,
        vendor_id,
        category,
      } = req.body;

      // If user is a vendor, they can only create products for their own vendor
      if (
        req.user.role === 'vendor' &&
        req.user.vendor_id !== parseInt(vendor_id)
      ) {
        return res
          .status(403)
          .json({
            error: 'You can only create products for your own vendor account',
          });
      }

      const result = await pool.query(
        `INSERT INTO products (name, image, bulk_price, retail_price, moq, vendor_id, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
        [
          name,
          image || 'default-product',
          bulk_price,
          retail_price,
          moq,
          vendor_id,
          category,
        ],
      );

      res.status(201).json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// PUT /api/products/:id - Update product (vendor only)
router.put(
  '/:id',
  authenticateToken,
  canAccessVendorDashboard,
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        image,
        bulk_price,
        retail_price,
        moq,
        category,
        is_active,
      } = req.body;

      // Check if product exists and user has permission
      const productCheck = await pool.query(
        'SELECT vendor_id FROM products WHERE id = $1',
        [id],
      );

      if (productCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // If user is a vendor, they can only update their own products
      if (
        req.user.role === 'vendor' &&
        req.user.vendor_id !== productCheck.rows[0].vendor_id
      ) {
        return res
          .status(403)
          .json({ error: 'You can only update your own products' });
      }

      const updates = [];
      const values = [];
      let paramCount = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(name);
      }
      if (image !== undefined) {
        updates.push(`image = $${paramCount++}`);
        values.push(image);
      }
      if (bulk_price !== undefined) {
        updates.push(`bulk_price = $${paramCount++}`);
        values.push(bulk_price);
      }
      if (retail_price !== undefined) {
        updates.push(`retail_price = $${paramCount++}`);
        values.push(retail_price);
      }
      if (moq !== undefined) {
        updates.push(`moq = $${paramCount++}`);
        values.push(moq);
      }
      if (category !== undefined) {
        updates.push(`category = $${paramCount++}`);
        values.push(category);
      }
      if (is_active !== undefined) {
        updates.push(`is_active = $${paramCount++}`);
        values.push(is_active);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(id);

      const result = await pool.query(
        `UPDATE products 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
        values,
      );

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// DELETE /api/products/:id - Delete product (vendor only)
router.delete(
  '/:id',
  authenticateToken,
  canAccessVendorDashboard,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if product exists and user has permission
      const productCheck = await pool.query(
        'SELECT vendor_id FROM products WHERE id = $1',
        [id],
      );

      if (productCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // If user is a vendor, they can only delete their own products
      if (
        req.user.role === 'vendor' &&
        req.user.vendor_id !== productCheck.rows[0].vendor_id
      ) {
        return res
          .status(403)
          .json({ error: 'You can only delete your own products' });
      }

      // Soft delete (set is_active to false) or hard delete
      await pool.query('UPDATE products SET is_active = false WHERE id = $1', [
        id,
      ]);

      res.json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
