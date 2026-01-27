import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getUserConversations,
  getConversationById,
  createGroupVendorConversation,
  getConversationParticipants,
  getMessages,
  sendMessage,
  markAsRead,
  deleteMessage,
  setTypingIndicator,
  getTypingUsers,
  getUnreadCount,
} from '../controllers/chat.controller.js';

const router = express.Router();
// All routes require authentication
router.use(authenticateToken);

// ============================================
// CONVERSATION ROUTES
// ============================================

/**
 * GET /api/chat/conversations
 * Get all conversations for the current user
 * Query params:
 *   - type: filter by conversation type ('group' | 'group-vendor')
 *   - groupId: filter by specific group
 */
router.get('/conversations', getUserConversations);

/**
 * GET /api/chat/conversations/:conversationId
 * Get a specific conversation with details
 */
router.get('/conversations/:conversationId', getConversationById);

/**
 * POST /api/chat/conversations/group-vendor
 * Create a new group-vendor conversation
 * Body: { groupId, vendorId, productId? }
 */
router.post('/conversations/group-vendor', createGroupVendorConversation);

/**
 * GET /api/chat/conversations/:conversationId/participants
 * Get all participants in a conversation
 */
router.get('/conversations/:conversationId/participants', getConversationParticipants);

// ============================================
// MESSAGE ROUTES
// ============================================

/**
 * GET /api/chat/conversations/:conversationId/messages
 * Get messages for a conversation
 * Query params:
 *   - limit: number of messages (default: 50)
 *   - before: timestamp for pagination
 */
router.get('/conversations/:conversationId/messages', getMessages);

/**
 * POST /api/chat/conversations/:conversationId/messages
 * Send a message in a conversation
 * Body: { content }
 */
router.post('/conversations/:conversationId/messages', sendMessage);

/**
 * PUT /api/chat/conversations/:conversationId/read
 * Mark all messages in a conversation as read
 */
router.put('/conversations/:conversationId/read', markAsRead);

/**
 * DELETE /api/chat/messages/:messageId
 * Delete a message (soft delete)
 */
router.delete('/messages/:messageId', deleteMessage);

// ============================================
// TYPING INDICATOR ROUTES
// ============================================

/**
 * POST /api/chat/conversations/:conversationId/typing
 * Indicate user is typing
 * Body: { isTyping: boolean }
 */
router.post('/conversations/:conversationId/typing', setTypingIndicator);

/**
 * GET /api/chat/conversations/:conversationId/typing
 * Get users currently typing in a conversation
 */
router.get('/conversations/:conversationId/typing', getTypingUsers);

// ============================================
// STATS ROUTES
// ============================================

/**
 * GET /api/chat/unread-count
 * Get total unread message count for current user
 */
router.get('/unread-count', getUnreadCount);


export default router;
