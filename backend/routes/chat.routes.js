const express = require('express');
const router = express.Router();
const { authenticateToken } = require('backend/middleware/auth.middleware');
const chatController = require('backend/controllers/chat.controller');

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
router.get('/conversations', chatController.getUserConversations);

/**
 * GET /api/chat/conversations/:conversationId
 * Get a specific conversation with details
 */
router.get('/conversations/:conversationId', chatController.getConversationById);

/**
 * POST /api/chat/conversations/group-vendor
 * Create a new group-vendor conversation
 * Body: { groupId, vendorId, productId? }
 */
router.post('/conversations/group-vendor', chatController.createGroupVendorConversation);

/**
 * GET /api/chat/conversations/:conversationId/participants
 * Get all participants in a conversation
 */
router.get('/conversations/:conversationId/participants', chatController.getConversationParticipants);

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
router.get('/conversations/:conversationId/messages', chatController.getMessages);

/**
 * POST /api/chat/conversations/:conversationId/messages
 * Send a message in a conversation
 * Body: { content }
 */
router.post('/conversations/:conversationId/messages', chatController.sendMessage);

/**
 * PUT /api/chat/conversations/:conversationId/read
 * Mark all messages in a conversation as read
 */
router.put('/conversations/:conversationId/read', chatController.markAsRead);

/**
 * DELETE /api/chat/messages/:messageId
 * Delete a message (soft delete)
 */
router.delete('/messages/:messageId', chatController.deleteMessage);

// ============================================
// TYPING INDICATOR ROUTES
// ============================================

/**
 * POST /api/chat/conversations/:conversationId/typing
 * Indicate user is typing
 * Body: { isTyping: boolean }
 */
router.post('/conversations/:conversationId/typing', chatController.setTypingIndicator);

/**
 * GET /api/chat/conversations/:conversationId/typing
 * Get users currently typing in a conversation
 */
router.get('/conversations/:conversationId/typing', chatController.getTypingUsers);

// ============================================
// STATS ROUTES
// ============================================

/**
 * GET /api/chat/unread-count
 * Get total unread message count for current user
 */
router.get('/unread-count', chatController.getUnreadCount);

module.exports = router;
