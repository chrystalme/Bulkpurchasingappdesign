import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../lib/fileDb.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function isMember(groupId, userId) {
  return !!db.find('group_members', (m) => m.group_id === groupId && m.user_id === userId);
}

function enrichConversation(c) {
  const group = db.byId('groups', c.group_id);
  const messages = db.where('messages', (m) => m.conversation_id === c.id);
  const last = messages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  return {
    ...c,
    group_name: group?.name,
    group_admin_id: group?.admin_id,
    vendor: c.vendor_id ? db.byId('vendors', c.vendor_id) : null,
    last_message: last?.body || null,
    last_message_at: last?.created_at || null,
    message_count: messages.length,
  };
}

// GET /api/chat/conversations
router.get('/conversations', requireAuth, (req, res) => {
  const memberships = db.where('group_members', (m) => m.user_id === req.user.id);
  const groupIds = new Set(memberships.map((m) => m.group_id));

  const convos = db.where('conversations', (c) => groupIds.has(c.group_id))
    .map(enrichConversation)
    .sort((a, b) => new Date(b.last_message_at || b.created_at) - new Date(a.last_message_at || a.created_at));

  res.json(convos);
});

// GET /api/chat/conversations/:id/messages
router.get('/conversations/:id/messages', requireAuth, (req, res) => {
  const convo = db.byId('conversations', req.params.id);
  if (!convo) return res.status(404).json({ error: 'Conversation not found' });

  if (!isMember(convo.group_id, req.user.id)) return res.status(403).json({ error: 'Not a group member' });

  const group = db.byId('groups', convo.group_id);
  const limit = Math.min(100, parseInt(req.query.limit) || 50);

  const messages = db
    .where('messages', (m) => m.conversation_id === req.params.id)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-limit)
    .map((m) => {
      const sender = db.byId('users', m.sender_id);
      return { ...m, sender_name: sender?.name, sender_avatar: sender?.avatar, sender_role: sender?.role };
    });

  res.json({
    messages,
    conversation: enrichConversation(convo),
    can_send: convo.type === 'internal' || group?.admin_id === req.user.id,
  });
});

// POST /api/chat/conversations/:id/messages
router.post('/conversations/:id/messages', requireAuth, (req, res) => {
  const { body, attachment_url } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: 'body is required' });

  const convo = db.byId('conversations', req.params.id);
  if (!convo) return res.status(404).json({ error: 'Conversation not found' });
  if (!isMember(convo.group_id, req.user.id)) return res.status(403).json({ error: 'Not a group member' });

  const group = db.byId('groups', convo.group_id);

  // Transparency rule: only admin sends to vendor conversations
  if (convo.type === 'vendor' && group?.admin_id !== req.user.id) {
    return res.status(403).json({
      error: 'Only the group admin can send messages to vendors. All members can read for transparency.',
    });
  }

  const sender = db.byId('users', req.user.id);
  const message = db.insert('messages', {
    id: `msg-${uuid()}`,
    conversation_id: req.params.id,
    sender_id: req.user.id,
    body: body.trim(),
    attachment_url: attachment_url || null,
  });

  const fullMessage = {
    ...message,
    sender_name: sender?.name,
    sender_avatar: sender?.avatar,
    sender_role: sender?.role,
  };

  // Broadcast via Socket.IO to conversation room
  const io = req.app.get('io');
  if (io) io.to(`convo:${req.params.id}`).emit('new-message', fullMessage);

  res.status(201).json(fullMessage);
});

// POST /api/chat/groups/:groupId/conversations
router.post('/groups/:groupId/conversations', requireAuth, (req, res) => {
  const { type, vendor_id } = req.body;
  if (!['internal', 'vendor'].includes(type)) return res.status(400).json({ error: 'type must be internal or vendor' });
  if (type === 'vendor' && !vendor_id) return res.status(400).json({ error: 'vendor_id required for vendor type' });

  const group = db.byId('groups', req.params.groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const isAdmin = ['admin', 'superUser'].includes(req.user.role);
  if (group.admin_id !== req.user.id && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

  // Check for existing
  const existing = db.find('conversations', (c) =>
    c.group_id === req.params.groupId && c.type === type && (type === 'internal' || c.vendor_id === vendor_id)
  );
  if (existing) return res.json(enrichConversation(existing));

  const convo = db.insert('conversations', {
    id: `conv-${uuid()}`,
    group_id: req.params.groupId,
    type,
    vendor_id: vendor_id || null,
  });

  res.status(201).json(enrichConversation(convo));
});

export default router;
