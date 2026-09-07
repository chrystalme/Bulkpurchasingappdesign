import jwt from 'jsonwebtoken';
import db from '../lib/fileDb.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  let payload;
  try {
    payload = jwt.verify(header.slice(7), process.env.JWT_SECRET || 'dev-secret');
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const u = db.byId('users', payload.userId);
  if (!u) return res.status(401).json({ error: 'User not found' });

  const { password_hash: _, ...user } = u;
  req.user = user;
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Requires role: ${roles.join(' or ')}` });
    }
    next();
  };
}
