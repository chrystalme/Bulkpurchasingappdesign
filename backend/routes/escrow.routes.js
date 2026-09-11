import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/escrow/transactions - Get escrow transactions
//
// Members and vendors only ever see transactions they are a party to
// (buyer or seller). Admins and superUsers moderate the platform, so an
// unfiltered request returns every transaction on the platform — this is
// what backs the admin "Platform Transactions" screen. Passing an explicit
// ?type=buyer|seller still scopes the result to the caller.
router.get('/transactions', async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.query; // 'buyer', 'seller', or 'all'
    const isAdmin = req.user.role === 'superUser' || req.user.role === 'admin';

    let query = `
      SELECT 
        et.*,
        o.order_number,
        o.status as order_status,
        bp.name as buyer_name,
        bp.email as buyer_email,
        sp.name as seller_name,
        sp.email as seller_email,
        COALESCE(
          json_agg(
            json_build_object(
              'product_name', p.name,
              'quantity', oi.quantity,
              'price', oi.price
            )
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'
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
    } else if (!isAdmin) {
      query += ` AND (et.buyer_id = $${paramCount} OR et.seller_id = $${paramCount})`;
      params.push(userId);
      paramCount++;
    }

    query +=
      ' GROUP BY et.id, o.order_number, o.status, bp.name, bp.email, sp.name, sp.email ORDER BY et.created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      scope: isAdmin && !type ? 'platform' : 'own',
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

// GET /api/escrow/disputes - Get all disputes (admin) or user's disputes
router.get('/disputes', async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'superUser' || req.user.role === 'admin';

    let query = `
      SELECT 
        d.*,
        et.transaction_number,
        et.amount,
        et.buyer_id,
        et.seller_id,
        bp.name as buyer_name,
        sp.name as seller_name,
        COALESCE(
          json_agg(
            json_build_object(
              'id', de.id,
              'uploaded_by', de.uploaded_by,
              'type', de.type,
              'url', de.url,
              'description', de.description,
              'created_at', de.created_at
            )
          ) FILTER (WHERE de.id IS NOT NULL),
          '[]'
        ) as evidence
      FROM disputes d
      JOIN escrow_transactions et ON d.transaction_id = et.id
      JOIN users bp ON et.buyer_id = bp.id
      JOIN users sp ON et.seller_id = sp.id
      LEFT JOIN dispute_evidence de ON d.id = de.dispute_id
    `;

    const params = [];
    if (!isAdmin) {
      query += ` WHERE (et.buyer_id = $1 OR et.seller_id = $1)`;
      params.push(userId);
    }

    query += ` GROUP BY d.id, et.transaction_number, et.amount, et.buyer_id, et.seller_id, bp.name, sp.name ORDER BY d.created_at DESC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get disputes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/escrow/disputes - Open a dispute for an escrow transaction
router.post('/disputes', async (req, res) => {
  const client = await pool.connect();
  try {
    const { transactionId, reason, description } = req.body;
    const userId = req.user.id;

    // Admin and superUser cannot create a dispute (they mediate and resolve disputes)
    if (req.user.role === 'admin' || req.user.role === 'superUser') {
      return res.status(403).json({
        error: 'Only group admins can open disputes. System administrators mediate and resolve disputes.',
      });
    }

    if (!transactionId || !reason) {
      return res.status(400).json({ error: 'Transaction ID and reason are required' });
    }

    // Verify transaction exists
    const txCheck = await client.query(
      'SELECT * FROM escrow_transactions WHERE id = $1',
      [transactionId]
    );

    if (txCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const tx = txCheck.rows[0];

    // Check if current user is the group admin for the group that placed this order
    const groupAdminCheck = await client.query(
      `SELECT gm.role 
       FROM group_members gm 
       JOIN orders o ON o.group_id = gm.group_id 
       WHERE o.id = $1 AND gm.user_id = $2 AND gm.role = 'admin'`,
      [tx.order_id, userId]
    );

    if (groupAdminCheck.rows.length === 0) {
      // Also check if user is the direct group creator
      const groupCreatorCheck = await client.query(
        `SELECT g.id 
         FROM groups g 
         JOIN orders o ON o.group_id = g.id 
         WHERE o.id = $1 AND g.created_by = $2`,
        [tx.order_id, userId]
      );

      if (groupCreatorCheck.rows.length === 0) {
        return res.status(403).json({
          error: 'Only the group admin has permission to open a dispute on behalf of the group',
        });
      }
    }

    await client.query('BEGIN');

    // Update escrow transaction status
    await client.query(
      "UPDATE escrow_transactions SET status = 'disputed' WHERE id = $1",
      [transactionId]
    );

    const disputeNumber = `DIS-${Date.now().toString().slice(-6)}`;

    // Create dispute
    const disputeResult = await client.query(
      `INSERT INTO disputes (dispute_number, transaction_id, reason, status, admin_notes)
       VALUES ($1, $2, $3, 'open', $4)
       RETURNING *`,
      [disputeNumber, transactionId, reason, description || null]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: disputeResult.rows[0],
      message: 'Dispute filed successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create dispute error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// POST /api/escrow/disputes/:id/resolve - Admin resolves a dispute
router.post('/disputes/:id/resolve', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { resolution, adminNotes } = req.body;

    if (req.user.role !== 'superUser' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins and super users can resolve disputes' });
    }

    if (!resolution || !['refund_buyer', 'release_seller', 'partial_split'].includes(resolution)) {
      return res.status(400).json({ error: 'Valid resolution required: refund_buyer, release_seller, or partial_split' });
    }

    await client.query('BEGIN');

    // Update dispute
    const disputeResult = await client.query(
      `UPDATE disputes 
       SET status = 'resolved', resolution = $1, admin_notes = COALESCE($2, admin_notes), resolved_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [resolution, adminNotes, id]
    );

    if (disputeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const dispute = disputeResult.rows[0];

    // Update escrow transaction status based on resolution
    const finalStatus = resolution === 'refund_buyer' ? 'refunded' : 'released';
    await client.query(
      `UPDATE escrow_transactions 
       SET status = $1, released_at = NOW()
       WHERE id = $2`,
      [finalStatus, dispute.transaction_id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      data: dispute,
      message: `Dispute resolved with ${resolution}`,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Resolve dispute error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

export default router;
