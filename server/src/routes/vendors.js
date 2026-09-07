import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import db from '../lib/fileDb.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/vendors
router.get('/', (req, res) => {
  const { search, verified } = req.query;
  let vendors = db.all('vendors');

  if (verified === 'true') vendors = vendors.filter((v) => v.is_verified);
  if (search) vendors = vendors.filter((v) =>
    v.business_name.toLowerCase().includes(search.toLowerCase()) ||
    (v.location || '').toLowerCase().includes(search.toLowerCase())
  );

  res.json(vendors.sort((a, b) => b.rating - a.rating));
});

// GET /api/vendors/me/profile
router.get('/me/profile', requireAuth, requireRole('vendor'), (req, res) => {
  const vendor = db.find('vendors', (v) => v.user_id === req.user.id);
  if (!vendor) return res.status(404).json({ error: 'Vendor profile not found' });
  res.json(vendor);
});

// GET /api/vendors/:id
router.get('/:id', (req, res) => {
  const vendor = db.byId('vendors', req.params.id);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
  const products = db.where('products', (p) => p.vendor_id === req.params.id && p.is_active !== false);
  const reviews = db.where('reviews', (r) => r.vendor_id === req.params.id);
  res.json({ ...vendor, products, reviews });
});

// POST /api/vendors
router.post('/', requireAuth, requireRole('vendor', 'admin', 'superUser'), (req, res) => {
  const parsed = z.object({
    business_name:        z.string().min(2),
    description:          z.string().optional(),
    location:             z.string().optional(),
    logo:                 z.string().optional(),
    specialties:          z.array(z.string()).default([]),
    fulfillment_days_min: z.number().int().positive().default(2),
    fulfillment_days_max: z.number().int().positive().default(5),
  }).safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = db.find('vendors', (v) => v.user_id === req.user.id);
  if (existing) return res.status(409).json({ error: 'Vendor profile already exists' });

  const vendor = db.insert('vendors', {
    id: `vendor-${uuid()}`,
    user_id: req.user.id,
    rating: 0,
    review_count: 0,
    is_verified: false,
    ...parsed.data,
  });

  res.status(201).json(vendor);
});

// PATCH /api/vendors/:id
router.patch('/:id', requireAuth, (req, res) => {
  const vendor = db.byId('vendors', req.params.id);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

  const isOwner = vendor.user_id === req.user.id;
  const isAdmin = ['admin', 'superUser'].includes(req.user.role);
  if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

  const updated = db.update('vendors', req.params.id, req.body);
  res.json(updated);
});

// PATCH /api/vendors/:id/verify  — admin
router.patch('/:id/verify', requireAuth, requireRole('admin', 'superUser'), (req, res) => {
  const vendor = db.byId('vendors', req.params.id);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
  res.json(db.update('vendors', req.params.id, { is_verified: true }));
});

// GET /api/vendors/:id/orders
router.get('/:id/orders', requireAuth, (req, res) => {
  const vendor = db.byId('vendors', req.params.id);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

  const isOwner = vendor.user_id === req.user.id;
  const isAdmin = ['admin', 'superUser'].includes(req.user.role);
  if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

  const orders = db.where('orders', (o) => o.vendor_id === req.params.id);
  const enriched = orders.map((o) => ({
    ...o,
    product: db.byId('products', o.product_id),
    buyer: (() => { const u = db.byId('users', o.buyer_id); return u ? { id: u.id, name: u.name, avatar: u.avatar } : null; })(),
    group: db.byId('groups', o.group_id),
  }));

  res.json(enriched);
});

export default router;
