import express from 'express';
import pool from '../config/database.js';
import {
  authenticateToken,
  canAccessVendorDashboard,
} from '../middleware/auth.js';

const router = express.Router();

// GET /api/vendors - Get all vendors
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.*,
        COUNT(DISTINCT p.id) as product_count
      FROM vendors v
      LEFT JOIN products p ON v.id = p.vendor_id AND p.is_active = true
      GROUP BY v.id
      ORDER BY v.created_at DESC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/vendors/:id - Get vendor by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('SELECT * FROM vendors WHERE id = $1', [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Get vendor's products
    const productsResult = await pool.query(
      'SELECT * FROM products WHERE vendor_id = $1 AND is_active = true',
      [id],
    );

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        products: productsResult.rows,
      },
    });
  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/vendors/:id/dashboard - Get vendor dashboard stats
router.get(
  '/:id/dashboard',
  authenticateToken,
  canAccessVendorDashboard,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if user has permission to view this vendor's dashboard
      if (req.user.role === 'vendor' && req.user.vendor_id !== parseInt(id)) {
        return res
          .status(403)
          .json({ error: 'You can only view your own vendor dashboard' });
      }

      // Get total revenue
      const revenueResult = await pool.query(
        `
      SELECT 
        COALESCE(SUM(oi.price * oi.quantity), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN o.created_at >= NOW() - INTERVAL '30 days' THEN oi.price * oi.quantity ELSE 0 END), 0) as monthly_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE p.vendor_id = $1 AND o.status != 'cancelled'
    `,
        [id],
      );

      // Get order counts
      const ordersResult = await pool.query(
        `
      SELECT 
        COUNT(DISTINCT o.id) as total_orders,
        COUNT(DISTINCT CASE WHEN o.status IN ('pending', 'paid', 'confirmed') THEN o.id END) as pending_orders
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE p.vendor_id = $1
    `,
        [id],
      );

      // Get product count
      const productsResult = await pool.query(
        'SELECT COUNT(*) as total_products FROM products WHERE vendor_id = $1 AND is_active = true',
        [id],
      );

      // Get customer count
      const customersResult = await pool.query(
        `
      SELECT COUNT(DISTINCT o.buyer_id) as total_customers
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE p.vendor_id = $1
    `,
        [id],
      );

      // Get vendor rating
      const vendorResult = await pool.query(
        'SELECT rating, verified FROM vendors WHERE id = $1',
        [id],
      );

      res.json({
        success: true,
        data: {
          total_revenue: parseFloat(revenueResult.rows[0].total_revenue),
          monthly_revenue: parseFloat(revenueResult.rows[0].monthly_revenue),
          total_orders: parseInt(ordersResult.rows[0].total_orders),
          pending_orders: parseInt(ordersResult.rows[0].pending_orders),
          total_products: parseInt(productsResult.rows[0].total_products),
          total_customers: parseInt(customersResult.rows[0].total_customers),
          average_rating: parseFloat(vendorResult.rows[0].rating),
          total_reviews: 0, // TODO: Implement reviews system
        },
      });
    } catch (error) {
      console.error('Get vendor dashboard error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// GET /api/vendors/:id/orders - Get vendor orders
router.get(
  '/:id/orders',
  authenticateToken,
  canAccessVendorDashboard,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if user has permission
      if (req.user.role === 'vendor' && req.user.vendor_id !== parseInt(id)) {
        return res
          .status(403)
          .json({ error: 'You can only view your own orders' });
      }

      const result = await pool.query(
        `
      SELECT 
        o.id,
        o.order_number,
        p.id as product_id,
        p.name as product_name,
        u.name as customer_name,
        oi.quantity,
        (oi.price * oi.quantity) as total_amount,
        o.status,
        o.created_at as order_date,
        et.status as escrow_status
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      JOIN users u ON o.buyer_id = u.id
      LEFT JOIN escrow_transactions et ON o.id = et.order_id
      WHERE p.vendor_id = $1
      ORDER BY o.created_at DESC
    `,
        [id],
      );

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      console.error('Get vendor orders error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// GET /api/vendors/:id/customers - Get vendor customers
router.get(
  '/:id/customers',
  authenticateToken,
  canAccessVendorDashboard,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if user has permission
      if (req.user.role === 'vendor' && req.user.vendor_id !== parseInt(id)) {
        return res
          .status(403)
          .json({ error: 'You can only view your own customers' });
      }

      const result = await pool.query(
        `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.avatar,
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(oi.price * oi.quantity), 0) as total_spent,
        MAX(o.created_at) as last_order_date,
        COALESCE(u.trust_score, 0) as trust_score
      FROM users u
      JOIN orders o ON u.id = o.buyer_id
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE p.vendor_id = $1
      GROUP BY u.id, u.name, u.email, u.avatar, u.trust_score
      ORDER BY total_spent DESC
    `,
        [id],
      );

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      console.error('Get vendor customers error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
