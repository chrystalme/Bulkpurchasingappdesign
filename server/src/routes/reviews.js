import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../lib/fileDb.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', (req, res) => {
  const { vendor_id } = req.query;
  if (!vendor_id) return res.status(400).json({ error: 'vendor_id required' });

  const reviews = db.where('reviews', (r) => r.vendor_id === vendor_id).map((r) => {
    const reviewer = db.byId('users', r.reviewer_id);
    return { ...r, reviewer_name: reviewer?.name, reviewer_avatar: reviewer?.avatar };
  });

  res.json(reviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
});

router.post('/', requireAuth, (req, res) => {
  const { order_id, vendor_id, rating, comment } = req.body;
  if (!order_id || !vendor_id || !rating) return res.status(400).json({ error: 'order_id, vendor_id, rating required' });
  if (rating < 1 || rating > 5) return res.status(400).json({ error: 'rating must be 1-5' });

  const order = db.byId('orders', order_id);
  if (!order || order.buyer_id !== req.user.id) return res.status(403).json({ error: 'Order not found or not yours' });

  const existing = db.find('reviews', (r) => r.order_id === order_id && r.reviewer_id === req.user.id);
  if (existing) return res.status(409).json({ error: 'Already reviewed this order' });

  const review = db.insert('reviews', {
    id: `review-${uuid()}`,
    order_id, vendor_id,
    reviewer_id: req.user.id,
    rating: parseInt(rating),
    comment: comment || null,
  });

  // Recalculate vendor rating
  const allReviews = db.where('reviews', (r) => r.vendor_id === vendor_id);
  const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
  db.update('vendors', vendor_id, { rating: Math.round(avg * 10) / 10, review_count: allReviews.length });

  res.status(201).json(review);
});

export default router;
