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

// ============================================
// GET ALL CONVERSATIONS
// ============================================

router.get('/conversations', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;
    const { type, groupId } = req.query;

    let query;
    let params;

    // Build query based on conversation types
    if (role === 'vendor') {
      // Vendors see: direct chats with members + group-vendor chats
      query = `
        SELECT 
          c.id,
          c.conversation_type,
          c.vendor_id,
          c.member_id,
          c.group_id,
          c.product_id,
          c.title,
          c.avatar,
          c.status,
          c.last_message_at,
          c.created_at,
          -- For direct chats
          CASE 
            WHEN c.conversation_type = 'direct' THEN u_member.name
            ELSE NULL
          END as member_name,
          CASE 
            WHEN c.conversation_type = 'direct' THEN u_member.avatar
            ELSE NULL
          END as member_avatar,
          -- For group chats
          CASE 
            WHEN c.conversation_type IN ('group-internal', 'group-vendor') THEN g.name
            ELSE NULL
          END as group_name,
          p.name as product_name,
          p.image as product_image,
          (SELECT message_text FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
          (SELECT COUNT(*) FROM messages m 
           LEFT JOIN group_conversation_participants gcp ON m.conversation_id = gcp.conversation_id AND gcp.user_id = $1
           WHERE m.conversation_id = c.id 
             AND m.sender_id != $1 
             AND m.is_read = false
             AND (
               c.conversation_type = 'direct' 
               OR (c.conversation_type IN ('group-internal', 'group-vendor') AND m.created_at > gcp.last_read_at)
             )
          ) as unread_count
        FROM conversations c
        LEFT JOIN users u_member ON c.member_id = u_member.id
        LEFT JOIN groups g ON c.group_id = g.id
        LEFT JOIN products p ON c.product_id = p.id
        LEFT JOIN group_conversation_participants gcp ON c.id = gcp.conversation_id AND gcp.user_id = $1
        WHERE c.status = 'active'
          AND (
            (c.conversation_type = 'direct' AND c.vendor_id = $1)
            OR (c.conversation_type = 'group-vendor' AND gcp.user_id IS NOT NULL)
          )
      `;
      params = [userId];
    } else {
      // Members/Admins see: direct chats + all group chats they're part of
      query = `
        SELECT 
          c.id,
          c.conversation_type,
          c.vendor_id,
          c.member_id,
          c.group_id,
          c.product_id,
          c.title,
          c.avatar,
          c.status,
          c.last_message_at,
          c.created_at,
          -- For direct chats
          CASE 
            WHEN c.conversation_type = 'direct' THEN u_vendor.name
            ELSE NULL
          END as vendor_name,
          CASE 
            WHEN c.conversation_type = 'direct' THEN u_vendor.avatar
            ELSE NULL
          END as vendor_avatar,
          -- For group chats
          CASE 
            WHEN c.conversation_type IN ('group-internal', 'group-vendor') THEN g.name
            ELSE NULL
          END as group_name,
          CASE 
            WHEN c.conversation_type = 'group-vendor' THEN u_vendor.name
            ELSE NULL
          END as group_vendor_name,
          v.rating as vendor_rating,
          v.verified as vendor_verified,
          p.name as product_name,
          p.image as product_image,
          gcp.can_send,
          (SELECT message_text FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
          (SELECT COUNT(*) FROM messages m 
           LEFT JOIN group_conversation_participants gcp2 ON m.conversation_id = gcp2.conversation_id AND gcp2.user_id = $1
           WHERE m.conversation_id = c.id 
             AND m.sender_id != $1 
             AND m.is_read = false
             AND (
               c.conversation_type = 'direct' 
               OR (c.conversation_type IN ('group-internal', 'group-vendor') AND m.created_at > gcp2.last_read_at)
             )
          ) as unread_count
        FROM conversations c
        LEFT JOIN users u_vendor ON c.vendor_id = u_vendor.id
        LEFT JOIN groups g ON c.group_id = g.id
        LEFT JOIN vendors v ON u_vendor.vendor_id = v.id
        LEFT JOIN products p ON c.product_id = p.id
        LEFT JOIN group_conversation_participants gcp ON c.id = gcp.conversation_id AND gcp.user_id = $1
        WHERE c.status = 'active'
          AND (
            (c.conversation_type = 'direct' AND c.member_id = $1)
            OR (c.conversation_type IN ('group-internal', 'group-vendor') AND gcp.user_id IS NOT NULL)
          )
      `;
      params = [userId];
    }

    // Add filters
    const conditions = [];
    if (type) {
      conditions.push(`c.conversation_type = $${params.length + 1}`);
      params.push(type);
    }
    if (groupId) {
      conditions.push(`c.group_id = $${params.length + 1}`);
      params.push(groupId);
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ' ORDER BY c.last_message_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// ============================================
// CREATE GROUP-VENDOR CONVERSATION
// ============================================

router.post('/conversations/group-vendor', authenticate, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.userId;
    const { groupId, vendorId, productId } = req.body;

    if (!groupId || !vendorId) {
      return res.status(400).json({ error: 'groupId and vendorId are required' });
    }

    await client.query('BEGIN');

    // Check if user is admin of the group
    const groupCheck = await client.query(
      `SELECT gm.role, g.name
       FROM group_members gm
       JOIN groups g ON gm.group_id = g.id
       WHERE gm.group_id = $1 AND gm.user_id = $2`,
      [groupId, userId]
    );

    if (groupCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const groupName = groupCheck.rows[0].name;

    // Check if vendor exists
    const vendorCheck = await client.query(
      'SELECT name, avatar FROM users WHERE id = $1 AND role = $2',
      [vendorId, 'vendor']
    );

    if (vendorCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const vendorName = vendorCheck.rows[0].name;
    const vendorAvatar = vendorCheck.rows[0].avatar;

    // Check if conversation already exists
    const existingConv = await client.query(
      'SELECT * FROM conversations WHERE group_id = $1 AND vendor_id = $2 AND conversation_type = $3',
      [groupId, vendorId, 'group-vendor']
    );

    if (existingConv.rows.length > 0) {
      await client.query('COMMIT');
      return res.json(existingConv.rows[0]);
    }

    // Create new group-vendor conversation
    const conversationResult = await client.query(
      `INSERT INTO conversations (conversation_type, title, avatar, group_id, vendor_id, product_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       RETURNING *`,
      ['group-vendor', vendorName, vendorAvatar, groupId, vendorId, productId]
    );

    const conversation = conversationResult.rows[0];

    // Get all group members
    const groupMembers = await client.query(
      'SELECT user_id, role FROM group_members WHERE group_id = $1',
      [groupId]
    );

    // Add all group members as participants
    for (const member of groupMembers.rows) {
      const canSend = member.role === 'admin'; // Only admins can send in group-vendor chats
      
      await client.query(
        `INSERT INTO group_conversation_participants (conversation_id, user_id, role, can_send)
         VALUES ($1, $2, $3, $4)`,
        [conversation.id, member.user_id, member.role, canSend]
      );
    }

    // Add vendor as participant
    await client.query(
      `INSERT INTO group_conversation_participants (conversation_id, user_id, role, can_send)
       VALUES ($1, $2, $3, $4)`,
      [conversation.id, vendorId, 'vendor', true]
    );

    await client.query('COMMIT');

    // Notify vendor
    emitToUser(vendorId, 'conversation:new', {
      conversation,
      groupName,
    });

    res.status(201).json(conversation);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating group-vendor conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  } finally {
    client.release();
  }
});

// ============================================
// CREATE DIRECT CONVERSATION (LEGACY SUPPORT)
// ============================================

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
       WHERE vendor_id = $1 AND member_id = $2 AND product_id = $3 AND conversation_type = 'direct'`,
      [vendorId, userId, productId]
    );

    if (existingConv.rows.length > 0) {
      return res.json(existingConv.rows[0]);
    }

    // Get vendor name for title
    const vendorInfo = await pool.query(
      'SELECT name, avatar FROM users WHERE id = $1',
      [vendorId]
    );

    // Create new conversation
    const result = await pool.query(
      `INSERT INTO conversations (conversation_type, vendor_id, member_id, product_id, title, avatar, status)
       VALUES ('direct', $1, $2, $3, $4, $5, 'active')
       RETURNING *`,
      [vendorId, userId, productId, vendorInfo.rows[0].name, vendorInfo.rows[0].avatar]
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

// ============================================
// GET MESSAGES (WORKS FOR ALL CONVERSATION TYPES)
// ============================================

router.get('/conversations/:conversationId/messages', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;
    const { limit = 50, offset = 0 } = req.query;

    // Check conversation type and verify access
    const convCheck = await pool.query(
      `SELECT c.*, gcp.user_id as is_group_participant
       FROM conversations c
       LEFT JOIN group_conversation_participants gcp ON c.id = gcp.conversation_id AND gcp.user_id = $2
       WHERE c.id = $1`,
      [conversationId, userId]
    );

    if (convCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const conversation = convCheck.rows[0];

    // Verify access based on conversation type
    const hasAccess = 
      (conversation.conversation_type === 'direct' && (conversation.vendor_id === userId || conversation.member_id === userId)) ||
      (conversation.conversation_type IN ('group-internal', 'group-vendor') && conversation.is_group_participant);

    if (!hasAccess) {
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

// ============================================
// SEND MESSAGE (WORKS FOR ALL CONVERSATION TYPES)
// ============================================

router.post('/conversations/:conversationId/messages', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { messageText } = req.body;
    const userId = req.user.userId;

    if (!messageText || messageText.trim().length === 0) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    // Check conversation and permissions
    const convCheck = await pool.query(
      `SELECT c.*, gcp.can_send
       FROM conversations c
       LEFT JOIN group_conversation_participants gcp ON c.id = gcp.conversation_id AND gcp.user_id = $2
       WHERE c.id = $1`,
      [conversationId, userId]
    );

    if (convCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const conversation = convCheck.rows[0];

    // Verify user can send messages
    const canSend = 
      (conversation.conversation_type === 'direct' && (conversation.vendor_id === userId || conversation.member_id === userId)) ||
      (conversation.conversation_type IN ('group-internal', 'group-vendor') && conversation.can_send === true);

    if (!canSend) {
      return res.status(403).json({ error: 'You do not have permission to send messages in this conversation' });
    }

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

    res.status(201).json(messageWithSender);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ============================================
// MARK MESSAGES AS READ
// ============================================

router.put('/conversations/:conversationId/messages/read', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    // Update last_read_at for group conversations
    await pool.query(
      `UPDATE group_conversation_participants
       SET last_read_at = CURRENT_TIMESTAMP
       WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );

    // Also mark individual messages as read (for direct chats)
    const result = await pool.query(
      `UPDATE messages 
       SET is_read = true 
       WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false
       RETURNING id`,
      [conversationId, userId]
    );

    res.json({ 
      success: true, 
      messagesMarkedRead: result.rows.length 
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Keep all other existing endpoints (archive, unread-count, etc.)
// ... (copy from original file)

router.put('/conversations/:conversationId/archive', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    const convCheck = await pool.query(
      `SELECT c.*, gcp.user_id as is_participant
       FROM conversations c
       LEFT JOIN group_conversation_participants gcp ON c.id = gcp.conversation_id AND gcp.user_id = $2
       WHERE c.id = $1`,
      [conversationId, userId]
    );

    if (convCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }

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

router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT COUNT(*) as unread_count
       FROM messages m
       JOIN conversations c ON m.conversation_id = c.id
       LEFT JOIN group_conversation_participants gcp ON c.id = gcp.conversation_id AND gcp.user_id = $1
       WHERE c.status = 'active'
         AND m.sender_id != $1 
         AND (
           (c.conversation_type = 'direct' AND (c.vendor_id = $1 OR c.member_id = $1) AND m.is_read = false)
           OR (c.conversation_type IN ('group-internal', 'group-vendor') AND gcp.user_id IS NOT NULL AND m.created_at > gcp.last_read_at)
         )`,
      [userId]
    );

    res.json({ unreadCount: parseInt(result.rows[0].unread_count) });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

export default router;
