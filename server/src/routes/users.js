import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import db from '../lib/fileDb.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

function safeUser(u) {
  const { password_hash: _, ...rest } = u;
  return rest;
}

// GET /api/users
router.get('/', requireAuth, requireRole('admin', 'superUser'), (req, res) => {
  const { role } = req.query;
  let users = db.all('users');
  if (role) users = users.filter((u) => u.role === role);
  res.json(users.map(safeUser));
});

// GET /api/users/:id
router.get('/:id', requireAuth, (req, res) => {
  const isSelf = req.user.id === req.params.id;
  const isAdmin = ['admin', 'superUser'].includes(req.user.role);
  if (!isSelf && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

  const user = db.byId('users', req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(safeUser(user));
});

// POST /api/users — admin creates user
router.post('/', requireAuth, requireRole('admin', 'superUser'), async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ error: 'name, email, password, role required' });

    const existing = db.find('users', (u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const user = db.insert('users', {
      id: `user-${uuid()}`,
      name, email,
      password_hash: await bcrypt.hash(password, 12),
      role,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      is_verified: true,
    });

    res.status(201).json(safeUser(user));
  } catch (err) { next(err); }
});

// PATCH /api/users/:id
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const isSelf = req.user.id === req.params.id;
    const isAdmin = ['admin', 'superUser'].includes(req.user.role);
    if (!isSelf && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

    const { name, avatar, role, password } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (avatar) updates.avatar = avatar;
    if (role && isAdmin) updates.role = role;
    if (password) updates.password_hash = await bcrypt.hash(password, 12);

    const updated = db.update('users', req.params.id, updates);
    if (!updated) return res.status(404).json({ error: 'User not found' });

    res.json(safeUser(updated));
  } catch (err) { next(err); }
});

// DELETE /api/users/:id — superUser only
router.delete('/:id', requireAuth, requireRole('superUser'), (req, res) => {
  const removed = db.remove('users', req.params.id);
  if (!removed) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'User deleted' });
});

export default router;
