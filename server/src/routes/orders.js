import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import db from '../lib/fileDb.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

function enrichOrder(order) {
  return {
    ...order,
    product: db.byId('products', order.product_id),
    vendor: db.byId('vendors', order.vendor_id),
    group: db.byId('groups', order.group_id),
    escrow: db.find('escrow_transactions', (e) => e.order_id === order.id) || null,
  };
}

// GET /api/orders
router.get('/', requireAuth, (req, res) => {
  const orders = db.where('orders', (o) => o.buyer_id === req.user.id);
  res.json(orders.map(enrichOrder));
});

// GET /api/orders/:id
router.get('/:id', requireAuth, (req, res) => {
  const order = db.byId('orders', req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const isAdmin = ['admin', 'superUser'].includes(req.user.role);
  if (order.buyer_id !== req.user.id && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

  res.json(enrichOrder(order));
});

// POST /api/orders — place order + auto-create escrow
router.post('/', requireAuth, (req, res) => {
  const parsed = z.object({
    group_id:   z.string(),
    vendor_id:  z.string(),
    product_id: z.string(),
    qty:        z.number().int().positive(),
  }).safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const product = db.byId('products', parsed.data.product_id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if ((product.stock || 0) < parsed.data.qty) return res.status(409).json({ error: 'Insufficient stock' });

  const total = parseFloat(product.bulk_price) * parsed.data.qty;
  const orderId = `order-${uuid()}`;

  const order = db.insert('orders', {
    id: orderId,
    ...parsed.data,
    buyer_id: req.user.id,
    unit_price: product.bulk_price,
    total_amount: total,
    status: 'pending',
    tracking_ref: null,
  });

  // Reduce stock
  db.update('products', product.id, { stock: (product.stock || 0) - parsed.data.qty });

  // Auto-create escrow
  const inspectionEnds = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  db.insert('escrow_transactions', {
    id: `escrow-${uuid()}`,
    order_id: orderId,
    buyer_id: req.user.id,
    seller_id: parsed.data.vendor_id,
    amount: total,
    status: 'locked',
    inspection_ends_at: inspectionEnds,
    proof_url: null,
    released_at: null,
  });

  res.status(201).json(enrichOrder(order));
});

// PATCH /api/orders/:id/status — vendor / admin
router.patch('/:id/status', requireAuth, requireRole('vendor', 'admin', 'superUser'), (req, res) => {
  const { status, tracking_ref } = req.body;
  const allowed = ['confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });

  const order = db.byId('orders', req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const updated = db.update('orders', req.params.id, { status, ...(tracking_ref && { tracking_ref }) });

  // Move escrow to pending_inspection when shipped
  if (status === 'shipped') {
    const escrow = db.find('escrow_transactions', (e) => e.order_id === req.params.id);
    if (escrow && escrow.status === 'locked') {
      db.update('escrow_transactions', escrow.id, { status: 'pending_inspection' });
    }
  }

  res.json(enrichOrder(updated));
});

export default router;
