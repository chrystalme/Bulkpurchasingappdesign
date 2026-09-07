import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../lib/fileDb.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

function enrichEscrow(e) {
  const order = db.byId('orders', e.order_id);
  return {
    ...e,
    order: order ? {
      ...order,
      product: db.byId('products', order.product_id),
      group: db.byId('groups', order.group_id),
    } : null,
    vendor: db.byId('vendors', e.seller_id),
    disputes: db.where('disputes', (d) => d.escrow_id === e.id),
  };
}

// GET /api/escrow
router.get('/', requireAuth, (req, res) => {
  const rows = db.where('escrow_transactions', (e) => e.buyer_id === req.user.id);
  res.json(rows.map(enrichEscrow));
});

// GET /api/escrow/all — admin
router.get('/all', requireAuth, requireRole('admin', 'superUser'), (_req, res) => {
  res.json(db.all('escrow_transactions').map(enrichEscrow));
});

// GET /api/escrow/disputes — admin
router.get('/disputes', requireAuth, requireRole('admin', 'superUser'), (_req, res) => {
  const disputes = db.all('disputes').map((d) => {
    const escrow = db.byId('escrow_transactions', d.escrow_id);
    const raiser = db.byId('users', d.raised_by);
    return { ...d, escrow: enrichEscrow(escrow), raised_by_user: raiser ? { id: raiser.id, name: raiser.name } : null };
  });
  res.json(disputes);
});

// GET /api/escrow/:id
router.get('/:id', requireAuth, (req, res) => {
  const escrow = db.byId('escrow_transactions', req.params.id);
  if (!escrow) return res.status(404).json({ error: 'Not found' });

  const isAdmin = ['admin', 'superUser'].includes(req.user.role);
  if (escrow.buyer_id !== req.user.id && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

  res.json(enrichEscrow(escrow));
});

// POST /api/escrow/:id/pay — MOCK PAYMENT: marks escrow as locked (funds "deposited")
router.post('/:id/pay', requireAuth, (req, res) => {
  const escrow = db.byId('escrow_transactions', req.params.id);
  if (!escrow) return res.status(404).json({ error: 'Not found' });
  if (escrow.buyer_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  // Mock payment: just record payment timestamp
  const updated = db.update('escrow_transactions', req.params.id, {
    status: 'locked',
    paid_at: new Date().toISOString(),
  });
  res.json({ message: 'Payment received (mock)', escrow: enrichEscrow(updated) });
});

// POST /api/escrow/:id/upload-proof — vendor uploads proof
router.post('/:id/upload-proof', requireAuth, requireRole('vendor', 'admin', 'superUser'), (req, res) => {
  const { proof_url } = req.body;
  if (!proof_url) return res.status(400).json({ error: 'proof_url required' });

  const escrow = db.byId('escrow_transactions', req.params.id);
  if (!escrow) return res.status(404).json({ error: 'Not found' });

  const updated = db.update('escrow_transactions', req.params.id, {
    proof_url,
    status: 'pending_inspection',
    shipped_at: new Date().toISOString(),
  });

  // Also update order status
  db.update('orders', escrow.order_id, { status: 'shipped' });

  res.json(enrichEscrow(updated));
});

// POST /api/escrow/:id/release — buyer confirms delivery
router.post('/:id/release', requireAuth, (req, res) => {
  const escrow = db.byId('escrow_transactions', req.params.id);
  if (!escrow) return res.status(404).json({ error: 'Not found' });
  if (escrow.buyer_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  if (!['locked', 'pending_inspection'].includes(escrow.status)) {
    return res.status(409).json({ error: `Cannot release in '${escrow.status}' state` });
  }

  const updated = db.update('escrow_transactions', req.params.id, {
    status: 'released',
    released_at: new Date().toISOString(),
  });
  db.update('orders', escrow.order_id, { status: 'delivered' });

  res.json(enrichEscrow(updated));
});

// POST /api/escrow/:id/dispute — buyer opens dispute
router.post('/:id/dispute', requireAuth, (req, res) => {
  const { reason } = req.body;
  if (!reason?.trim()) return res.status(400).json({ error: 'reason is required' });

  const escrow = db.byId('escrow_transactions', req.params.id);
  if (!escrow) return res.status(404).json({ error: 'Not found' });
  if (escrow.buyer_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  if (escrow.status === 'released') return res.status(409).json({ error: 'Already released' });

  db.update('escrow_transactions', req.params.id, { status: 'disputed' });
  db.update('orders', escrow.order_id, { status: 'disputed' });

  const dispute = db.insert('disputes', {
    id: `dispute-${uuid()}`,
    escrow_id: req.params.id,
    raised_by: req.user.id,
    reason,
    status: 'open',
    resolution_note: null,
    resolved_by: null,
  });

  res.status(201).json(dispute);
});

// POST /api/escrow/disputes/:id/resolve — admin resolves
router.post('/disputes/:id/resolve', requireAuth, requireRole('admin', 'superUser'), (req, res) => {
  const { winner, resolution_note } = req.body;
  if (!['buyer', 'seller'].includes(winner)) return res.status(400).json({ error: 'winner must be buyer or seller' });

  const dispute = db.byId('disputes', req.params.id);
  if (!dispute) return res.status(404).json({ error: 'Dispute not found' });

  const disputeStatus = winner === 'buyer' ? 'resolved_buyer' : 'resolved_seller';
  db.update('disputes', req.params.id, { status: disputeStatus, resolution_note, resolved_by: req.user.id });

  const escrowStatus = winner === 'buyer' ? 'refunded' : 'released';
  const updated = db.update('escrow_transactions', dispute.escrow_id, { status: escrowStatus });

  res.json(enrichEscrow(updated));
});

export default router;
