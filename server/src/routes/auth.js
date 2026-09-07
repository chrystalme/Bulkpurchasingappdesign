import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import db from '../lib/fileDb.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function makeToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'dev-secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function safeUser(u) {
  const { password_hash: _, ...rest } = u;
  return rest;
}

// POST /api/auth/signup
router.post('/signup', async (req, res, next) => {
  try {
    const { name, email, password, role = 'member' } = req.body;

    const parsed = z.object({
      name:     z.string().min(2),
      email:    z.string().email(),
      password: z.string().min(6),
      role:     z.enum(['member', 'vendor']).default('member'),
    }).safeParse({ name, email, password, role });

    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const existing = db.find('users', (u) => u.email.toLowerCase() === parsed.data.email.toLowerCase());
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(parsed.data.password, 12);
    const user = db.insert('users', {
      id: `user-${uuid()}`,
      name: parsed.data.name,
      email: parsed.data.email,
      password_hash,
      role: parsed.data.role,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(parsed.data.name)}`,
      is_verified: false,
    });

    res.status(201).json({ token: makeToken(user.id), user: safeUser(user) });
  } catch (err) { next(err); }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const user = db.find('users', (u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    res.json({ token: makeToken(user.id), user: safeUser(user) });
  } catch (err) { next(err); }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

// POST /api/auth/logout
router.post('/logout', requireAuth, (_req, res) => res.json({ message: 'Logged out' }));

export default router;
