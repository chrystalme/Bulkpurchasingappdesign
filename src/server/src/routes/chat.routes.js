import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import pool from '../config/database.js';
import { emitToUser, emitToConversation } from '../config/socket.js';

const router = express.Router();

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Get all conversations for the authenticated user
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    let query;
    let params;

    if (role === 'vendor') {
      // Vendors see conversations where they are the vendor
      query = `
        SELECT 
          c.id,
          c.vendor_id,
          c.member_id,
          c.product_id,
          c.status,
          c.last_message_at,
          c.created_at,
          u.name as member_name,
          u.avatar as member_avatar,
          p.name as product_name,
          p.image as product_image,
          (SELECT message_text FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
          (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != $1 AND is_read = false) as unread_count
        FROM conversations c
        JOIN users u ON c.member_id = u.id
        LEFT JOIN products p ON c.product_id = p.id
        WHERE c.vendor_id = $1 AND c.status = 'active'
        ORDER BY c.last_message_at DESC
      `;
      params = [userId];
    } else {
      // Members see conversations where they are the member
      query = `
        SELECT 
          c.id,
          c.vendor_id,
          c.member_id,
          c.product_id,
          c.status,
          c.last_message_at,
          c.created_at,
          u.name as vendor_name,
          u.avatar as vendor_avatar,
          v.name as vendor_business_name,
          v.rating as vendor_rating,
          v.verified as vendor_verified,
          p.name as product_name,
          p.image as product_image,
          (SELECT message_text FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
          (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != $1 AND is_read = false) as unread_count
        FROM conversations c
        JOIN users u ON c.vendor_id = u.id
        LEFT JOIN vendors v ON u.vendor_id = v.id
        LEFT JOIN products p ON c.product_id = p.id
        WHERE c.member_id = $1 AND c.status = 'active'
        ORDER BY c.last_message_at DESC
      `;
      params = [userId];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get or create a conversation between vendor and member
router.post('/conversations', authenticate, async (req, res) => {
  try {
    const { vendorId, productId } = req.body;
    const userId = req.user.userId;
    const role = req.user.role;

    // Validate that members can only create conversations with vendors
    if (role === 'vendor') {
      return res.status(403).json({ error: 'Vendors cannot initiate conversations' });
    }

    // Check if conversation already exists
    const existingConv = await pool.query(
      `SELECT * FROM conversations 
       WHERE vendor_id = $1 AND member_id = $2 AND product_id = $3`,
      [vendorId, userId, productId]
    );

    if (existingConv.rows.length > 0) {
      return res.json(existingConv.rows[0]);
    }

    // Create new conversation
    const result = await pool.query(
      `INSERT INTO conversations (vendor_id, member_id, product_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [vendorId, userId, productId]
    );

    // Notify vendor of new conversation
    emitToUser(vendorId, 'conversation:new', {
      conversation: result.rows[0],
      memberName: req.user.name,
    });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get messages for a specific conversation
router.get('/conversations/:conversationId/messages', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;
    const { limit = 50, offset = 0 } = req.query;

    // Verify user is part of this conversation
    const convCheck = await pool.query(
      `SELECT * FROM conversations 
       WHERE id = $1 AND (vendor_id = $2 OR member_id = $2)`,
      [conversationId, userId]
    );

    if (convCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }

    // Get messages
    const messages = await pool.query(
      `SELECT 
        m.id,
        m.conversation_id,
        m.sender_id,
        m.message_text,
        m.is_read,
        m.created_at,
        u.name as sender_name,
        u.avatar as sender_avatar
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [conversationId, limit, offset]
    );

    res.json(messages.rows.reverse());
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message
router.post('/conversations/:conversationId/messages', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { messageText } = req.body;
    const userId = req.user.userId;

    if (!messageText || messageText.trim().length === 0) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    // Verify user is part of this conversation
    const convCheck = await pool.query(
      `SELECT * FROM conversations 
       WHERE id = $1 AND (vendor_id = $2 OR member_id = $2)`,
      [conversationId, userId]
    );

    if (convCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }

    const conversation = convCheck.rows[0];

    // Insert message
    const result = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, message_text)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [conversationId, userId, messageText]
    );

    // Update conversation's last_message_at
    await pool.query(
      `UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [conversationId]
    );

    const message = result.rows[0];

    // Get sender info
    const senderInfo = await pool.query(
      `SELECT name, avatar FROM users WHERE id = $1`,
      [userId]
    );

    const messageWithSender = {
      ...message,
      sender_name: senderInfo.rows[0].name,
      sender_avatar: senderInfo.rows[0].avatar,
    };

    // Emit message to conversation room via WebSocket
    emitToConversation(conversationId, 'message:new', messageWithSender);

    // Also emit to the recipient directly
    const recipientId = conversation.vendor_id === userId 
      ? conversation.member_id 
      : conversation.vendor_id;
    
    emitToUser(recipientId, 'message:received', {
      ...messageWithSender,
      conversationId,
    });

    res.status(201).json(messageWithSender);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark messages as read
router.put('/conversations/:conversationId/messages/read', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    // Verify user is part of this conversation
    const convCheck = await pool.query(
      `SELECT * FROM conversations 
       WHERE id = $1 AND (vendor_id = $2 OR member_id = $2)`,
      [conversationId, userId]
    );

    if (convCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }

    // Mark all messages from other users as read
    const result = await pool.query(
      `UPDATE messages 
       SET is_read = true 
       WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false
       RETURNING id`,
      [conversationId, userId]
    );

    // Notify the other party that messages were read
    const conversation = convCheck.rows[0];
    const otherUserId = conversation.vendor_id === userId 
      ? conversation.member_id 
      : conversation.vendor_id;

    emitToUser(otherUserId, 'messages:read', {
      conversationId,
      messageIds: result.rows.map(r => r.id),
    });

    res.json({ 
      success: true, 
      messagesMarkedRead: result.rows.length 
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Archive a conversation
router.put('/conversations/:conversationId/archive', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    // Verify user is part of this conversation
    const convCheck = await pool.query(
      `SELECT * FROM conversations 
       WHERE id = $1 AND (vendor_id = $2 OR member_id = $2)`,
      [conversationId, userId]
    );

    if (convCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }

    // Archive conversation
    await pool.query(
      `UPDATE conversations SET status = 'archived' WHERE id = $1`,
      [conversationId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error archiving conversation:', error);
    res.status(500).json({ error: 'Failed to archive conversation' });
  }
});

// Get unread message count
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT COUNT(*) as unread_count
       FROM messages m
       JOIN conversations c ON m.conversation_id = c.id
       WHERE (c.vendor_id = $1 OR c.member_id = $1) 
         AND m.sender_id != $1 
         AND m.is_read = false`,
      [userId]
    );

    res.json({ unreadCount: parseInt(result.rows[0].unread_count) });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

export default router;