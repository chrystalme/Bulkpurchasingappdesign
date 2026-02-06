import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/escrow/transactions - Get user's escrow transactions
router.get('/transactions', async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.query; // 'buyer', 'seller', or 'all'

    let query = `
      SELECT 
        et.*,
        o.order_number,
        bp.name as buyer_name,
        sp.name as seller_name,
        json_agg(
          json_build_object(
            'product_name', p.name,
            'quantity', oi.quantity,
            'price', oi.price
          )
        ) as products
      FROM escrow_transactions et
      JOIN orders o ON et.order_id = o.id
      JOIN users bp ON et.buyer_id = bp.id
      JOIN users sp ON et.seller_id = sp.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (type === 'buyer') {
      query += ` AND et.buyer_id = $${paramCount++}`;
      params.push(userId);
    } else if (type === 'seller') {
      query += ` AND et.seller_id = $${paramCount++}`;
      params.push(userId);
    } else {
      query += ` AND (et.buyer_id = $${paramCount} OR et.seller_id = $${paramCount})`;
      params.push(userId);
      paramCount++;
    }

    query +=
      ' GROUP BY et.id, o.order_number, bp.name, sp.name ORDER BY et.created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get escrow transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/escrow/transactions/:id - Get escrow transaction by ID
router.get('/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT 
        et.*,
        o.order_number,
        bp.name as buyer_name,
        bp.email as buyer_email,
        sp.name as seller_name,
        sp.email as seller_email
      FROM escrow_transactions et
      JOIN orders o ON et.order_id = o.id
      JOIN users bp ON et.buyer_id = bp.id
      JOIN users sp ON et.seller_id = sp.id
      WHERE et.id = $1
    `,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = result.rows[0];

    // Check permissions
    const isParticipant =
      transaction.buyer_id === userId || transaction.seller_id === userId;
    const isAdmin = req.user.role === 'superUser' || req.user.role === 'admin';

    if (!isParticipant && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error('Get escrow transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/escrow/transactions - Create escrow transaction
router.post('/transactions', async (req, res) => {
  try {
    const { order_id, seller_id, amount, escrow_fee } = req.body;
    const buyer_id = req.user.id;

    // Check if order exists and belongs to buyer
    const orderCheck = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND buyer_id = $2',
      [order_id, buyer_id],
    );

    if (orderCheck.rows.length === 0) {
      return res
        .status(404)
        .json({ error: 'Order not found or access denied' });
    }

    // Generate transaction number
    const transactionNumber = `ESC-${Date.now()}`;

    // Create escrow transaction
    const result = await pool.query(
      `INSERT INTO escrow_transactions 
        (transaction_number, order_id, buyer_id, seller_id, amount, escrow_fee, status, paid_at, auto_release_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'locked', NOW(), NOW() + INTERVAL '14 days')
       RETURNING *`,
      [
        transactionNumber,
        order_id,
        buyer_id,
        seller_id,
        amount,
        escrow_fee || 0,
      ],
    );

    // Update order status
    await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [
      'paid',
      order_id,
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Create escrow transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/escrow/transactions/:id/status - Update escrow status
router.put('/transactions/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, tracking_id, courier } = req.body;

    const validStatuses = [
      'locked',
      'pending_inspection',
      'released',
      'disputed',
      'refunded',
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Check if transaction exists and user has permission
    const transactionCheck = await pool.query(
      'SELECT * FROM escrow_transactions WHERE id = $1',
      [id],
    );

    if (transactionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = transactionCheck.rows[0];
    const isParticipant =
      transaction.buyer_id === req.user.id ||
      transaction.seller_id === req.user.id;
    const isAdmin = req.user.role === 'superUser' || req.user.role === 'admin';

    if (!isParticipant && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build update query
    const updates = ['status = $1'];
    const values = [status];
    let paramCount = 2;

    if (status === 'pending_inspection' && !transaction.shipped_at) {
      updates.push(`shipped_at = NOW()`);
      if (tracking_id) {
        updates.push(`tracking_id = $${paramCount++}`);
        values.push(tracking_id);
      }
      if (courier) {
        updates.push(`courier = $${paramCount++}`);
        values.push(courier);
      }
    }

    if (status === 'pending_inspection' && !transaction.inspection_deadline) {
      updates.push(`inspection_deadline = NOW() + INTERVAL '3 days'`);
      updates.push(`auto_release_at = NOW() + INTERVAL '3 days'`);
    }

    if (status === 'released' && !transaction.released_at) {
      updates.push(`released_at = NOW()`);
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE escrow_transactions 
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
    console.error('Update escrow status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/escrow/transactions/:id/confirm-delivery - Buyer confirms delivery
router.post('/transactions/:id/confirm-delivery', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if transaction exists and user is the buyer
    const transactionCheck = await pool.query(
      'SELECT * FROM escrow_transactions WHERE id = $1 AND buyer_id = $2',
      [id, userId],
    );

    if (transactionCheck.rows.length === 0) {
      return res
        .status(404)
        .json({ error: 'Transaction not found or access denied' });
    }

    const result = await pool.query(
      `UPDATE escrow_transactions 
       SET status = 'pending_inspection', 
           delivered_at = NOW(),
           inspection_deadline = NOW() + INTERVAL '3 days',
           auto_release_at = NOW() + INTERVAL '3 days'
       WHERE id = $1
       RETURNING *`,
      [id],
    );

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Confirm delivery error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/escrow/transactions/:id/release - Buyer releases funds
router.post('/transactions/:id/release', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if transaction exists and user is the buyer
    const transactionCheck = await pool.query(
      'SELECT * FROM escrow_transactions WHERE id = $1 AND buyer_id = $2',
      [id, userId],
    );

    if (transactionCheck.rows.length === 0) {
      return res
        .status(404)
        .json({ error: 'Transaction not found or access denied' });
    }

    const result = await pool.query(
      `UPDATE escrow_transactions 
       SET status = 'released', released_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id],
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Funds released to seller',
    });
  } catch (error) {
    console.error('Release funds error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
