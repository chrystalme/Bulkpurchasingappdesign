import pool from '../config/database.js';
import { notificationService } from '../services/notifications/index.js';

// ============================================
// CONVERSATION CONTROLLERS
// ============================================

/**
 * Get all conversations for the current user
 */
export const getUserConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, groupId } = req.query;

    let query = `
      SELECT 
        c.id,
        c.type,
        c.title,
        c.avatar,
        c.group_id,
        c.vendor_id,
        c.product_id,
        c.created_at,
        c.updated_at,
        g.name as group_name,
        vendor.name as vendor_name,
        vendor.avatar as vendor_avatar,
        vendor.is_online as is_vendor_online,
        CASE WHEN c.type = 'direct' THEN (
          SELECT u.name FROM users u WHERE u.id = (CASE WHEN c.user_a = $1 THEN c.user_b ELSE c.user_a END)
        ) END as direct_name,
        CASE WHEN c.type = 'direct' THEN (
          SELECT u.avatar FROM users u WHERE u.id = (CASE WHEN c.user_a = $1 THEN c.user_b ELSE c.user_a END)
        ) END as direct_avatar,
        CASE WHEN c.type = 'direct' THEN (
          SELECT u.is_online FROM users u WHERE u.id = (CASE WHEN c.user_a = $1 THEN c.user_b ELSE c.user_a END)
        ) END as direct_is_online,
        COALESCE(cp.role, gm.role) as user_role,
        COALESCE(
          CASE 
            WHEN c.type = 'group-vendor' THEN (
              (gm.role = 'admin' OR cp.role = 'admin' OR c.vendor_id = $1 OR cp.role = 'vendor')
              AND COALESCE(cp.can_send, true)
            )
            ELSE COALESCE(cp.can_send, true)
          END,
          false
        ) as can_send,
        (SELECT gm2.role FROM group_members gm2 WHERE gm2.group_id = c.group_id AND gm2.user_id = $1) as group_role,
        -- Last message
        (
          SELECT json_build_object(
            'id', m.id,
            'content', m.content,
            'senderId', m.sender_id,
            'senderName', u.name,
            'senderAvatar', u.avatar,
            'timestamp', m.created_at,
            'read', EXISTS(
              SELECT 1 FROM message_read_receipts mrr 
              WHERE mrr.message_id = m.id AND mrr.user_id = $1
            )
          )
          FROM messages m
          JOIN users u ON m.sender_id = u.id
          WHERE m.conversation_id = c.id AND m.is_deleted = false
          ORDER BY m.created_at DESC
          LIMIT 1
        ) as last_message,
        -- Unread count for this user
        (
          SELECT COUNT(m.id)
          FROM messages m
          WHERE m.conversation_id = c.id 
            AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamp)
            AND m.sender_id != $1
            AND m.is_deleted = false
        ) as unread_count,
        -- Typing users
        (
          SELECT json_agg(
            json_build_object(
              'userId', ti.user_id,
              'userName', tu.name
            )
          )
          FROM typing_indicators ti
          JOIN users tu ON ti.user_id = tu.id
          WHERE ti.conversation_id = c.id 
            AND ti.expires_at > CURRENT_TIMESTAMP
            AND ti.user_id != $1
        ) as typing_users
      FROM conversations c
      LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.user_id = $1
      LEFT JOIN group_members gm ON c.group_id = gm.group_id AND gm.user_id = $1
      LEFT JOIN groups g ON c.group_id = g.id
      LEFT JOIN users vendor ON c.vendor_id = vendor.id
      WHERE (cp.user_id = $1 OR (c.type = 'group-vendor' AND gm.user_id = $1))
    `;

    const params = [userId];
    const conditions = [];

    if (type) {
      conditions.push(`c.type = $${params.length + 1}`);
      params.push(type);
    }

    if (groupId) {
      conditions.push(`c.group_id = $${params.length + 1}`);
      params.push(groupId);
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ' ORDER BY c.updated_at DESC';

    const result = await pool.query(query, params);

    // Format response
    const conversations = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      title: row.type === 'direct' ? (row.direct_name || row.title) : row.title,
      avatar: row.type === 'direct' ? (row.direct_avatar || row.avatar) : row.avatar,
      groupId: row.group_id,
      groupName: row.group_name,
      vendorId: row.vendor_id,
      vendorName: row.vendor_name,
      vendorAvatar: row.vendor_avatar,
      productId: row.product_id,
      isOnline: row.type === 'direct'
        ? (row.direct_is_online || false)
        : (row.is_vendor_online || false),
      userRole: row.user_role,
      canSend: Boolean(row.can_send),
      groupRole: row.group_role,
      lastMessage: row.last_message,
      unreadCount: parseInt(row.unread_count) || 0,
      typingUsers: row.typing_users || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversations',
    });
  }
};

/**
 * Get a specific conversation by ID
 */
export const getConversationById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const result = await pool.query(
      `
      SELECT 
        c.id,
        c.type,
        c.title,
        c.avatar,
        c.group_id,
        c.vendor_id,
        c.product_id,
        c.created_at,
        c.updated_at,
        g.name as group_name,
        vendor.name as vendor_name,
        vendor.avatar as vendor_avatar,
        vendor.is_online as is_vendor_online,
        CASE WHEN c.type = 'direct' THEN (
          SELECT u.name FROM users u WHERE u.id = (CASE WHEN c.user_a = $2 THEN c.user_b ELSE c.user_a END)
        ) END as direct_name,
        CASE WHEN c.type = 'direct' THEN (
          SELECT u.avatar FROM users u WHERE u.id = (CASE WHEN c.user_a = $2 THEN c.user_b ELSE c.user_a END)
        ) END as direct_avatar,
        CASE WHEN c.type = 'direct' THEN (
          SELECT u.is_online FROM users u WHERE u.id = (CASE WHEN c.user_a = $2 THEN c.user_b ELSE c.user_a END)
        ) END as direct_is_online,
        COALESCE(cp.role, gm.role) as user_role,
        COALESCE(
          CASE 
            WHEN c.type = 'group-vendor' THEN (
              (gm.role = 'admin' OR cp.role = 'admin' OR c.vendor_id = $2 OR cp.role = 'vendor')
              AND COALESCE(cp.can_send, true)
            )
            ELSE COALESCE(cp.can_send, true)
          END,
          false
        ) as can_send
      FROM conversations c
      LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.user_id = $2
      LEFT JOIN group_members gm ON c.group_id = gm.group_id AND gm.user_id = $2
      LEFT JOIN groups g ON c.group_id = g.id
      LEFT JOIN users vendor ON c.vendor_id = vendor.id
      WHERE c.id = $1 AND (cp.user_id = $2 OR (c.type = 'group-vendor' AND gm.user_id = $2) OR gm.user_id = $2)
      `,
      [conversationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found or access denied',
      });
    }

    const row = result.rows[0];

    res.json({
      success: true,
      data: {
        id: row.id,
        type: row.type,
        title: row.type === 'direct' ? (row.direct_name || row.title) : row.title,
        avatar: row.type === 'direct' ? (row.direct_avatar || row.avatar) : row.avatar,
        groupId: row.group_id,
        groupName: row.group_name,
        vendorId: row.vendor_id,
        vendorName: row.vendor_name,
        vendorAvatar: row.vendor_avatar,
        productId: row.product_id,
        isOnline: row.type === 'direct'
          ? (row.direct_is_online || false)
          : (row.is_vendor_online || false),
        userRole: row.user_role,
        canSend: Boolean(row.can_send),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversation',
    });
  }
};

/**
 * Create a new group-vendor conversation
 */
export const createGroupVendorConversation = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const { groupId, vendorId, productId } = req.body;

    // Validate required fields
    if (!groupId || !vendorId) {
      return res.status(400).json({
        success: false,
        error: 'groupId and vendorId are required',
      });
    }

    await client.query('BEGIN');

    // Check if user is admin of the group
    const groupCheck = await client.query(
      `
      SELECT gm.role, g.name
      FROM group_members gm
      JOIN groups g ON gm.group_id = g.id
      WHERE gm.group_id = $1 AND gm.user_id = $2
      `,
      [groupId, userId]
    );

    if (groupCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        error: 'You are not a member of this group',
      });
    }

    const isAdmin = groupCheck.rows[0].role === 'admin';
    const groupName = groupCheck.rows[0].name;

    if (!isAdmin) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        error: 'Only group admins can initiate vendor conversations',
      });
    }

    // Check if vendor exists
    const vendorCheck = await client.query(
      'SELECT name, avatar FROM users WHERE id = $1 AND role = $2',
      [vendorId, 'vendor']
    );

    if (vendorCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Vendor not found',
      });
    }

    const vendorName = vendorCheck.rows[0].name;
    const vendorAvatar = vendorCheck.rows[0].avatar;

    // Check if conversation already exists
    const existingConv = await client.query(
      'SELECT id FROM conversations WHERE group_id = $1 AND vendor_id = $2 AND type = $3',
      [groupId, vendorId, 'group-vendor']
    );

    if (existingConv.rows.length > 0) {
      await client.query('COMMIT');
      return res.json({
        success: true,
        data: { id: existingConv.rows[0].id },
        message: 'Conversation already exists',
      });
    }

    // Create new group-vendor conversation
    const conversationResult = await client.query(
      `
      INSERT INTO conversations (type, title, avatar, group_id, vendor_id, product_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
      `,
      ['group-vendor', vendorName, vendorAvatar, groupId, vendorId, productId]
    );

    const conversationId = conversationResult.rows[0].id;

    // Get all group members
    const groupMembers = await client.query(
      'SELECT user_id, role FROM group_members WHERE group_id = $1',
      [groupId]
    );

    // Add all group members as participants
    for (const member of groupMembers.rows) {
      const canSend = member.role === 'admin'; // Only admins can send in group-vendor chats
      
      await client.query(
        `
        INSERT INTO conversation_participants (conversation_id, user_id, role, can_send)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (conversation_id, user_id) DO NOTHING
        `,
        [conversationId, member.user_id, member.role, canSend]
      );
    }

    // Add vendor as participant
    await client.query(
      `
      INSERT INTO conversation_participants (conversation_id, user_id, role, can_send)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (conversation_id, user_id) DO UPDATE
      SET role = 'vendor', can_send = true
      `,
      [conversationId, vendorId, 'vendor', true]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        id: conversationId,
        type: 'group-vendor',
        title: vendorName,
        groupId,
        groupName,
        vendorId,
      },
      message: 'Group-vendor conversation created successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating group-vendor conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create conversation',
    });
  } finally {
    client.release();
  }
};

/**
 * Create (or fetch) a 1:1 direct conversation between the current user
 * and another user. Idempotent: repeated calls return the same conversation.
 * Body: { userId }
 */
export const createDirectConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { userId: targetId } = req.body;

    if (!targetId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    if (targetId === userId) {
      return res.status(400).json({ success: false, error: 'Cannot start a conversation with yourself' });
    }

    // Target must exist and be active
    const targetCheck = await pool.query(
      'SELECT id, name, avatar FROM users WHERE id = $1 AND is_active = true',
      [targetId]
    );
    if (targetCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const target = targetCheck.rows[0];

    // Canonical pair: always store the sorted (user_a < user_b) pair so the
    // unique index dedupes conversations regardless of who initiates.
    const [userA, userB] = [userId, targetId].sort();

    // Get-or-create
    const existing = await pool.query(
      `SELECT id FROM conversations WHERE type = 'direct' AND user_a = $1 AND user_b = $2`,
      [userA, userB]
    );

    let conversationId;
    if (existing.rows.length > 0) {
      conversationId = existing.rows[0].id;
    } else {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const convResult = await client.query(
          `INSERT INTO conversations (type, title, avatar, user_a, user_b)
           VALUES ('direct', $1, $2, $3, $4)
           RETURNING id`,
          [target.name, target.avatar, userA, userB]
        );
        conversationId = convResult.rows[0].id;

        await client.query(
          `INSERT INTO conversation_participants (conversation_id, user_id, role, can_send)
           VALUES ($1, $2, 'member', true), ($1, $3, 'member', true)
           ON CONFLICT (conversation_id, user_id) DO NOTHING`,
          [conversationId, userA, userB]
        );

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        // Concurrent create hit the unique index -> fetch the winner
        if (error.code === '23505') {
          const winner = await pool.query(
            `SELECT id FROM conversations WHERE type = 'direct' AND user_a = $1 AND user_b = $2`,
            [userA, userB]
          );
          if (winner.rows.length > 0) {
            conversationId = winner.rows[0].id;
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      } finally {
        client.release();
      }
    }

    // Return the conversation in the same shape as the conversations list
    const convRow = await pool.query(
      `SELECT
         c.id,
         c.type,
         c.title,
         c.avatar,
         c.group_id,
         c.vendor_id,
         c.product_id,
         c.created_at,
         c.updated_at,
         peer.name as peer_name,
         peer.avatar as peer_avatar,
         peer.is_online as peer_is_online
       FROM conversations c
       JOIN users peer ON peer.id = (CASE WHEN c.user_a = $2 THEN c.user_b ELSE c.user_a END)
       WHERE c.id = $1`,
      [conversationId, userId]
    );

    if (convRow.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    const row = convRow.rows[0];
    res.status(existing.rows.length > 0 ? 200 : 201).json({
      success: true,
      data: {
        id: row.id,
        type: row.type,
        title: row.peer_name || row.title,
        avatar: row.peer_avatar || row.avatar,
        groupId: null,
        groupName: null,
        vendorId: null,
        vendorName: null,
        vendorAvatar: null,
        productId: null,
        isOnline: row.peer_is_online || false,
        userRole: 'member',
        canSend: true,
        groupRole: null,
        lastMessage: null,
        unreadCount: 0,
        typingUsers: [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    console.error('Create direct conversation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create conversation' });
  }
};

/**
 * Get all participants in a conversation
 */
export const getConversationParticipants = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    // Check if user is part of this conversation
    const accessCheck = await pool.query(
      `SELECT c.id 
       FROM conversations c
       LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.user_id = $2
       LEFT JOIN group_members gm ON c.group_id = gm.group_id AND gm.user_id = $2
       WHERE c.id = $1 AND (cp.user_id = $2 OR gm.user_id = $2 OR c.vendor_id = $2)`,
      [conversationId, userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this conversation',
      });
    }

    const result = await pool.query(
      `
      SELECT 
        cp.user_id,
        cp.role,
        cp.can_send,
        u.name,
        u.avatar,
        u.is_online
      FROM conversation_participants cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.conversation_id = $1
      ORDER BY cp.role, u.name
      `,
      [conversationId]
    );

    const participants = result.rows.map(row => ({
      userId: row.user_id,
      name: row.name,
      avatar: row.avatar,
      role: row.role,
      canSend: row.can_send,
      isOnline: row.is_online,
    }));

    res.json({
      success: true,
      data: participants,
    });
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch participants',
    });
  }
};

// ============================================
// MESSAGE CONTROLLERS
// ============================================

/**
 * Get messages for a conversation
 */
export const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { limit = 50, before } = req.query;

    // Check if user is part of this conversation
    const accessCheck = await pool.query(
      `SELECT c.id 
       FROM conversations c
       LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.user_id = $2
       LEFT JOIN group_members gm ON c.group_id = gm.group_id AND gm.user_id = $2
       WHERE c.id = $1 AND (cp.user_id = $2 OR gm.user_id = $2 OR c.vendor_id = $2)`,
      [conversationId, userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this conversation',
      });
    }

    let query = `
      SELECT 
        m.id,
        m.conversation_id,
        m.sender_id,
        m.content,
        m.created_at,
        m.updated_at,
        m.is_deleted,
        u.name as sender_name,
        u.avatar as sender_avatar,
        EXISTS(
          SELECT 1 FROM message_read_receipts mrr 
          WHERE mrr.message_id = m.id AND mrr.user_id = $2
        ) as read
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1 AND m.is_deleted = false
    `;

    const params = [conversationId, userId];

    if (before) {
      query += ` AND m.created_at < $${params.length + 1}`;
      params.push(before);
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);

    const messages = result.rows.reverse().map(row => ({
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      senderAvatar: row.sender_avatar,
      content: row.content,
      timestamp: row.created_at,
      read: row.read,
      isOwn: row.sender_id === userId,
    }));

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages',
    });
  }
};

/**
 * Send a message in a conversation
 */
export const sendMessage = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Message content is required',
      });
    }

    await client.query('BEGIN');

    // Check if user can send messages in this conversation
    const participantCheck = await client.query(
      `
      SELECT 
        c.type as conversation_type,
        c.vendor_id,
        cp.role as participant_role,
        cp.can_send as participant_can_send,
        gm.role as group_role,
        COALESCE(
          CASE 
            WHEN c.type = 'group-vendor' THEN (
              (gm.role = 'admin' OR cp.role = 'admin' OR c.vendor_id = $2 OR cp.role = 'vendor')
              AND COALESCE(cp.can_send, true)
            )
            ELSE COALESCE(cp.can_send, true)
          END,
          false
        ) as can_send,
        u.name,
        u.avatar
      FROM conversations c
      JOIN users u ON u.id = $2
      LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.user_id = $2
      LEFT JOIN group_members gm ON c.group_id = gm.group_id AND gm.user_id = $2
      WHERE c.id = $1 AND (cp.user_id = $2 OR gm.user_id = $2 OR c.vendor_id = $2)
      `,
      [conversationId, userId]
    );

    if (participantCheck.rows.length === 0) {
      console.log(`Message send failed: User ${userId} is not a participant in conversation ${conversationId}.`);
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        error: 'Access denied to this conversation',
      });
    }

    const participantRow = participantCheck.rows[0];
    let canSend = participantRow.can_send;
    if (participantRow.conversation_type === 'group-vendor') {
      const isGroupAdmin = participantRow.group_role === 'admin' || participantRow.participant_role === 'admin';
      const isVendor = participantRow.vendor_id === userId || participantRow.participant_role === 'vendor';
      if (!isGroupAdmin && !isVendor) {
        canSend = false;
      } else if (participantRow.participant_can_send === false) {
        canSend = false;
      }
    }

    if (!canSend) {
      console.log(`Message send failed: User ${userId} does not have send permission in conversation ${conversationId}.`);
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to send messages in this conversation',
      });
    }

    const senderName = participantRow.name;
    const senderAvatar = participantRow.avatar;

    // Insert message
    const messageResult = await client.query(
      `
      INSERT INTO messages (conversation_id, sender_id, content)
      VALUES ($1, $2, $3)
      RETURNING id, created_at
      `,
      [conversationId, userId, content.trim()]
    );

    const messageId = messageResult.rows[0].id;
    const createdAt = messageResult.rows[0].created_at;

    // Update conversation's updated_at
    await client.query(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [conversationId]
    );

    // Clear typing indicator for this user
    await client.query(
      'DELETE FROM typing_indicators WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    await client.query('COMMIT');

    const message = {
      id: messageId,
      conversationId,
      senderId: userId,
      senderName,
      senderAvatar,
      content: content.trim(),
      timestamp: createdAt,
      read: false,
      isOwn: true,
    };

    // Emit socket event (handled in socket.io server)
    if (req.app.get('io')) {
      const io = req.app.get('io');
      const target = io.to(conversationId);
      if (typeof target.to === 'function') {
        target.to(`conversation:${conversationId}`).emit('new-message', message);
      } else {
        target.emit('new-message', message);
      }
    }

    // Notify offline participants via external channels (SMS/WhatsApp)
    notificationService.notifyOfflineParticipants(
      conversationId, userId, senderName, content.trim()
    ).catch(() => {}); // Fire-and-forget, never block response

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
    });
  } finally {
    client.release();
  }
};

/**
 * Mark all messages in a conversation as read
 */
export const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    // Update last_read_at for this user in this conversation
    const result = await pool.query(
      `
      UPDATE conversation_participants
      SET last_read_at = CURRENT_TIMESTAMP
      WHERE conversation_id = $1 AND user_id = $2
      RETURNING last_read_at
      `,
      [conversationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this conversation',
      });
    }

    res.json({
      success: true,
      data: {
        conversationId,
        lastReadAt: result.rows[0].last_read_at,
      },
    });
  } catch (error) {
    console.error('Error marking as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark as read',
    });
  }
};

/**
 * Delete a message (soft delete)
 */
export const deleteMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;

    // Check if user owns this message
    const result = await pool.query(
      `
      UPDATE messages
      SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND sender_id = $2
      RETURNING id, conversation_id
      `,
      [messageId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Message not found or you do not have permission to delete it',
      });
    }

    const conversationId = result.rows[0].conversation_id;

    // Emit socket event
    if (req.app.get('io')) {
      const io = req.app.get('io');
      const target = io.to(conversationId);
      if (typeof target.to === 'function') {
        target.to(`conversation:${conversationId}`).emit('message-deleted', { messageId, conversationId });
      } else {
        target.emit('message-deleted', { messageId, conversationId });
      }
    }

    res.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete message',
    });
  }
};

// ============================================
// TYPING INDICATOR CONTROLLERS
// ============================================

/**
 * Set typing indicator
 */
export const setTypingIndicator = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { isTyping } = req.body;

    if (isTyping) {
      // Add/update typing indicator (expires in 5 seconds)
      await pool.query(
        `
        INSERT INTO typing_indicators (conversation_id, user_id, expires_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '5 seconds')
        ON CONFLICT (conversation_id, user_id)
        DO UPDATE SET expires_at = CURRENT_TIMESTAMP + INTERVAL '5 seconds'
        `,
        [conversationId, userId]
      );

      // Emit socket event
      if (req.app.get('io')) {
        const io = req.app.get('io');
        const target = io.to(conversationId);
        if (typeof target.to === 'function') {
          target.to(`conversation:${conversationId}`).emit('user-typing', {
            userId,
            conversationId,
            isTyping: true,
          });
        } else {
          target.emit('user-typing', {
            userId,
            conversationId,
            isTyping: true,
          });
        }
      }
    } else {
      // Remove typing indicator
      await pool.query(
        'DELETE FROM typing_indicators WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, userId]
      );

      // Emit socket event
      if (req.app.get('io')) {
        const io = req.app.get('io');
        const target = io.to(conversationId);
        if (typeof target.to === 'function') {
          target.to(`conversation:${conversationId}`).emit('user-typing', {
            userId,
            conversationId,
            isTyping: false,
          });
        } else {
          target.emit('user-typing', {
            userId,
            conversationId,
            isTyping: false,
          });
        }
      }
    }

    res.json({
      success: true,
    });
  } catch (error) {
    console.error('Error setting typing indicator:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set typing indicator',
    });
  }
};

/**
 * Get typing users
 */
export const getTypingUsers = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const result = await pool.query(
      `
      SELECT ti.user_id, u.name
      FROM typing_indicators ti
      JOIN users u ON ti.user_id = u.id
      WHERE ti.conversation_id = $1 AND ti.expires_at > CURRENT_TIMESTAMP
      `,
      [conversationId]
    );

    const typingUsers = result.rows.map(row => ({
      userId: row.user_id,
      userName: row.name,
    }));

    res.json({
      success: true,
      data: typingUsers,
    });
  } catch (error) {
    console.error('Error fetching typing users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch typing users',
    });
  }
};

// ============================================
// STATS CONTROLLERS
// ============================================

/**
 * Get total unread count for current user
 */
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT COUNT(m.id) as total_unread
      FROM messages m
      JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
      WHERE cp.user_id = $1
        AND m.created_at > cp.last_read_at
        AND m.sender_id != $1
        AND m.is_deleted = false
      `,
      [userId]
    );

    res.json({
      success: true,
      data: {
        unreadCount: parseInt(result.rows[0].total_unread) || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch unread count',
    });
  }
};
