import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import db from './lib/fileDb.js';

import authRoutes    from './routes/auth.js';
import userRoutes    from './routes/users.js';
import vendorRoutes  from './routes/vendors.js';
import productRoutes from './routes/products.js';
import groupRoutes   from './routes/groups.js';
import orderRoutes   from './routes/orders.js';
import escrowRoutes  from './routes/escrow.js';
import chatRoutes    from './routes/chat.js';
import reviewRoutes  from './routes/reviews.js';
import { errorHandler, notFound } from './middleware/error.js';

const app    = express();
const server = createServer(app);
const PORT   = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// ── Socket.IO ──────────────────────────────────────────────────────
const io = new SocketIO(server, {
  cors: { origin: CORS_ORIGIN, credentials: true },
});

// Authenticate socket connections via JWT in handshake auth
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));

  try {
    const { userId } = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    const u = db.byId('users', userId);
    if (!u) return next(new Error('User not found'));
    const { password_hash: _, ...user } = u;
    socket.user = user;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const { id, name, role } = socket.user;
  console.log(`[socket] connected: ${name} (${role}) — ${socket.id}`);

  // Join a conversation room — must match frontend chatSocket.ts event names (hyphenated)
  socket.on('join-conversation', (conversationId) => {
    socket.join(`convo:${conversationId}`);
    console.log(`[socket] ${name} joined convo:${conversationId}`);
  });

  socket.on('leave-conversation', (conversationId) => {
    socket.leave(`convo:${conversationId}`);
  });

  // Client sends a message via socket (alternative to HTTP POST)
  socket.on('send-message', ({ conversationId, body, attachmentUrl }) => {
    if (!body?.trim()) return;

    const convo = db.byId('conversations', conversationId);
    if (!convo) return;

    const isMember = db.find('group_members', (m) => m.group_id === convo.group_id && m.user_id === id);
    if (!isMember) return;

    const group = db.byId('groups', convo.group_id);
    if (convo.type === 'vendor' && group?.admin_id !== id) return;

    const message = db.insert('messages', {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      conversation_id: conversationId,
      sender_id: id,
      body: body.trim(),
      attachment_url: attachmentUrl || null,
    });

    const sender = db.byId('users', id);
    const fullMessage = {
      ...message,
      sender_name: sender?.name,
      sender_avatar: sender?.avatar,
      sender_role: sender?.role,
    };

    io.to(`convo:${conversationId}`).emit('new-message', fullMessage);
  });

  // Typing indicators
  socket.on('typing', ({ conversationId }) => {
    socket.to(`convo:${conversationId}`).emit('user-typing', { userId: id, name });
  });

  socket.on('stop-typing', ({ conversationId }) => {
    socket.to(`convo:${conversationId}`).emit('user-stop-typing', { userId: id });
  });

  socket.on('disconnect', () => {
    console.log(`[socket] disconnected: ${name}`);
  });
});

// Expose io to route handlers
app.set('io', io);

// ── Express middleware ─────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { error: 'Too many auth attempts' } }));
app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 300, message: { error: 'Too many requests' } }));

// ── Routes ─────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/vendors',  vendorRoutes);
app.use('/api/products', productRoutes);
app.use('/api/groups',   groupRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/escrow',   escrowRoutes);
app.use('/api/chat',     chatRoutes);
app.use('/api/reviews',  reviewRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use(notFound);
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n  SaveTogether API  →  http://localhost:${PORT}`);
  console.log(`  WebSocket ready   →  ws://localhost:${PORT}`);
  console.log(`  DB path           →  server/data/db.json`);
  console.log(`  NODE_ENV          →  ${process.env.NODE_ENV || 'development'}\n`);
});
