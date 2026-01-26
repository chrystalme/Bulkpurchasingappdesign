import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../../server/src/config/database.js';
import { authenticateToken } from '../../server/src/middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/orders - Get user's orders
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT 
        o.*,
        json_agg(
          json_build_object(
            'id', oi.id,
            'product_id', p.id,
            'product_name', p.name,
            'quantity', oi.quantity,
            'price', oi.price
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.buyer_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `,
      [userId],
    );

    res.json({
      success: true,
      orders: result.rows,
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/orders/:id - Get order by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const result = await pool.query(
      `
      SELECT 
        o.*,
        json_agg(
          json_build_object(
            'id', oi.id,
            'product_id', p.id,
            'product_name', p.name,
            'image', p.image,
            'quantity', oi.quantity,
            'price', oi.price
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.id = $1
      GROUP BY o.id
    `,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = result.rows[0];

    // Check permissions
    if (
      order.buyer_id !== userId &&
      userRole !== 'superUser' &&
      userRole !== 'admin'
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/orders - Create new order
router.post(
  '/',
  [
    body('items')
      .isArray({ min: 1 })
      .withMessage('Order must have at least one item'),
    body('items.*.product_id')
      .isInt()
      .withMessage('Valid product ID is required'),
    body('items.*.quantity')
      .isInt({ min: 1 })
      .withMessage('Valid quantity is required'),
  ],
  async (req, res) => {
    const client = await pool.connect();

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { items, group_id } = req.body;
      const buyer_id = req.user.id;

      await client.query('BEGIN');

      // Calculate total amount
      let totalAmount = 0;
      const orderItems = [];

      for (const item of items) {
        const productResult = await client.query(
          'SELECT id, name, bulk_price, moq FROM products WHERE id = $1 AND is_active = true',
          [item.product_id],
        );

        if (productResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res
            .status(404)
            .json({ error: `Product ${item.product_id} not found` });
        }

        const product = productResult.rows[0];

        // Check MOQ
        if (item.quantity < product.moq) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            error: `Quantity for ${product.name} must be at least ${product.moq}`,
          });
        }

        const itemTotal = product.bulk_price * item.quantity;
        totalAmount += itemTotal;

        orderItems.push({
          product_id: product.id,
          quantity: item.quantity,
          price: product.bulk_price,
        });
      }

      // Generate order number
      const orderNumber = `ORD-${Date.now()}`;

      // Create order
      const orderResult = await client.query(
        `INSERT INTO orders (order_number, buyer_id, group_id, status, total_amount, estimated_delivery)
       VALUES ($1, $2, $3, 'pending', $4, NOW() + INTERVAL '7 days')
       RETURNING *`,
        [orderNumber, buyer_id, group_id || null, totalAmount],
      );

      const order = orderResult.rows[0];

      // Create order items
      for (const item of orderItems) {
        await client.query(
          'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
          [order.id, item.product_id, item.quantity, item.price],
        );
      }

      await client.query('COMMIT');

      // Fetch the complete order with items
      const completeOrder = await pool.query(
        `
      SELECT 
        o.*,
        json_agg(
          json_build_object(
            'id', oi.id,
            'product_id', p.id,
            'product_name', p.name,
            'quantity', oi.quantity,
            'price', oi.price
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.id = $1
      GROUP BY o.id
    `,
        [order.id],
      );

      res.status(201).json({
        success: true,
        order: completeOrder.rows[0],
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Create order error:', error);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  },
);

// PUT /api/orders/:id/status - Update order status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
      'pending',
      'paid',
      'confirmed',
      'shipped',
      'delivered',
      'cancelled',
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Check if order exists and user has permission
    const orderCheck = await pool.query(
      'SELECT buyer_id FROM orders WHERE id = $1',
      [id],
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Only buyer, vendor, or admin can update status
    const isOwner = orderCheck.rows[0].buyer_id === req.user.id;
    const isAdmin = req.user.role === 'superUser' || req.user.role === 'admin';
    const isVendor = req.user.role === 'vendor';

    if (!isOwner && !isAdmin && !isVendor) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id],
    );

    res.json({
      success: true,
      order: result.rows[0],
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
