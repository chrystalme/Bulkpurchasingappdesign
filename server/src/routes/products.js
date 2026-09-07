import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import db from '../lib/fileDb.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

function withVendor(product) {
  const vendor = db.byId('vendors', product.vendor_id);
  return { ...product, vendor: vendor || null };
}

// GET /api/products
router.get('/', (req, res) => {
  const { category, search, vendor_id, page = '1', limit = '20' } = req.query;
  let products = db.where('products', (p) => p.is_active !== false);

  if (category) products = products.filter((p) => p.category === category);
  if (vendor_id) products = products.filter((p) => p.vendor_id === vendor_id);
  if (search) products = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const total = products.length;
  const pageN = Math.max(1, parseInt(page));
  const limitN = Math.min(50, parseInt(limit));
  const paginated = products.slice((pageN - 1) * limitN, pageN * limitN).map(withVendor);

  res.json({ products: paginated, total, page: pageN, limit: limitN });
});

// GET /api/products/categories
router.get('/categories', (_req, res) => {
  const products = db.where('products', (p) => p.is_active !== false);
  const map = {};
  products.forEach((p) => { map[p.category] = (map[p.category] || 0) + 1; });
  res.json(Object.entries(map).map(([category, count]) => ({ category, count })).sort((a, b) => a.category.localeCompare(b.category)));
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const product = db.byId('products', req.params.id);
  if (!product || product.is_active === false) return res.status(404).json({ error: 'Product not found' });
  res.json(withVendor(product));
});

// POST /api/products
router.post('/', requireAuth, requireRole('vendor', 'admin', 'superUser'), (req, res) => {
  const parsed = z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    category: z.string().min(1),
    unit: z.string().min(1),
    retail_price: z.number().positive(),
    bulk_price: z.number().positive(),
    moq: z.number().int().positive().default(5),
    stock: z.number().int().min(0).default(0),
    images: z.array(z.string()).default([]),
  }).safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const vendor = db.find('vendors', (v) => v.user_id === req.user.id);
  if (!vendor && !['admin', 'superUser'].includes(req.user.role)) {
    return res.status(403).json({ error: 'No vendor profile found' });
  }

  const product = db.insert('products', {
    id: `prod-${uuid()}`,
    vendor_id: vendor?.id,
    ...parsed.data,
    is_active: true,
  });

  res.status(201).json(product);
});

// PATCH /api/products/:id
router.patch('/:id', requireAuth, (req, res) => {
  const product = db.byId('products', req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const vendor = db.byId('vendors', product.vendor_id);
  const isOwner = vendor?.user_id === req.user.id;
  const isAdmin = ['admin', 'superUser'].includes(req.user.role);
  if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

  const updated = db.update('products', req.params.id, req.body);
  res.json(updated);
});

// DELETE /api/products/:id (soft delete)
router.delete('/:id', requireAuth, (req, res) => {
  const product = db.byId('products', req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  db.update('products', req.params.id, { is_active: false });
  res.json({ message: 'Product removed' });
});

export default router;
