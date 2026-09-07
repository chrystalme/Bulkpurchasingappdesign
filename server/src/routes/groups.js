import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import db from '../lib/fileDb.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function enrichGroup(group) {
  const members = db.where('group_members', (m) => m.group_id === group.id).map((m) => {
    const user = db.byId('users', m.user_id);
    return { ...m, user: user ? { id: user.id, name: user.name, avatar: user.avatar, role: user.role } : null };
  });
  return {
    ...group,
    members,
    product: db.byId('products', group.product_id),
    vendor: db.byId('vendors', group.vendor_id),
  };
}

// GET /api/groups — user's groups
router.get('/', requireAuth, (req, res) => {
  const memberships = db.where('group_members', (m) => m.user_id === req.user.id);
  const groups = memberships.map((m) => {
    const g = db.byId('groups', m.group_id);
    return g ? enrichGroup(g) : null;
  }).filter(Boolean);
  res.json(groups);
});

// GET /api/groups/public
router.get('/public', (_req, res) => {
  const groups = db.where('groups', (g) => g.status === 'forming').map(enrichGroup);
  res.json(groups);
});

// GET /api/groups/:id
router.get('/:id', requireAuth, (req, res) => {
  const group = db.byId('groups', req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  res.json(enrichGroup(group));
});

// POST /api/groups
router.post('/', requireAuth, (req, res) => {
  const parsed = z.object({
    name:        z.string().min(2),
    description: z.string().optional(),
    product_id:  z.string().optional(),
    vendor_id:   z.string().optional(),
    target_qty:  z.number().int().positive().default(10),
    deadline:    z.string().optional(),
  }).safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const groupId = `group-${uuid()}`;
  const group = db.insert('groups', {
    id: groupId,
    ...parsed.data,
    admin_id: req.user.id,
    status: 'forming',
    current_qty: 1,
    invite_code: Math.random().toString(36).slice(2, 10).toUpperCase(),
  });

  // Creator auto-joins
  db.insert('group_members', { id: `gm-${uuid()}`, group_id: groupId, user_id: req.user.id, qty: 1, joined_at: new Date().toISOString() });

  // Auto-create internal conversation
  db.insert('conversations', { id: `conv-${uuid()}`, group_id: groupId, type: 'internal', vendor_id: null });
  if (parsed.data.vendor_id) {
    db.insert('conversations', { id: `conv-${uuid()}`, group_id: groupId, type: 'vendor', vendor_id: parsed.data.vendor_id });
  }

  res.status(201).json(enrichGroup(group));
});

// POST /api/groups/join
router.post('/join', requireAuth, (req, res) => {
  const { invite_code, qty = 1 } = req.body;
  if (!invite_code) return res.status(400).json({ error: 'invite_code required' });

  const group = db.find('groups', (g) => g.invite_code === invite_code);
  if (!group) return res.status(404).json({ error: 'Invalid invite code' });
  if (group.status !== 'forming') return res.status(409).json({ error: 'Group no longer accepting members' });

  const alreadyMember = db.find('group_members', (m) => m.group_id === group.id && m.user_id === req.user.id);
  if (alreadyMember) return res.status(409).json({ error: 'Already a member' });

  db.insert('group_members', { id: `gm-${uuid()}`, group_id: group.id, user_id: req.user.id, qty, joined_at: new Date().toISOString() });

  const newQty = group.current_qty + qty;
  const newStatus = newQty >= group.target_qty ? 'active' : 'forming';
  db.update('groups', group.id, { current_qty: newQty, status: newStatus });

  res.json({ message: 'Joined group', group_id: group.id });
});

// PATCH /api/groups/:id
router.patch('/:id', requireAuth, (req, res) => {
  const group = db.byId('groups', req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const isAdmin = ['admin', 'superUser'].includes(req.user.role);
  if (group.admin_id !== req.user.id && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

  const updated = db.update('groups', req.params.id, req.body);
  res.json(enrichGroup(updated));
});

// DELETE /api/groups/:id/leave
router.delete('/:id/leave', requireAuth, (req, res) => {
  const member = db.find('group_members', (m) => m.group_id === req.params.id && m.user_id === req.user.id);
  if (!member) return res.status(404).json({ error: 'Not a member' });

  db.remove('group_members', member.id);

  const group = db.byId('groups', req.params.id);
  if (group) db.update('groups', group.id, { current_qty: Math.max(0, group.current_qty - member.qty) });

  res.json({ message: 'Left group' });
});

export default router;
