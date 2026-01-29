import pool from '../config/database.js';

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
            AND m.created_at > cp.last_read_at
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
      JOIN conversation_participants cp ON c.id = cp.conversation_id
      LEFT JOIN groups g ON c.group_id = g.id
      LEFT JOIN users vendor ON c.vendor_id = vendor.id
      WHERE cp.user_id = $1
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
      title: row.title,
      avatar: row.avatar,
      groupId: row.group_id,
      groupName: row.group_name,
      vendorId: row.vendor_id,
      vendorName: row.vendor_name,
      vendorAvatar: row.vendor_avatar,
      productId: row.product_id,
      isOnline: row.is_vendor_online || false,
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
        cp.role as user_role,
        cp.can_send
      FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id
      LEFT JOIN groups g ON c.group_id = g.id
      LEFT JOIN users vendor ON c.vendor_id = vendor.id
      WHERE c.id = $1 AND cp.user_id = $2
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
        title: row.title,
        avatar: row.avatar,
        groupId: row.group_id,
        groupName: row.group_name,
        vendorId: row.vendor_id,
        vendorName: row.vendor_name,
        vendorAvatar: row.vendor_avatar,
        productId: row.product_id,
        isOnline: row.is_vendor_online || false,
        userRole: row.user_role,
        canSend: row.can_send,
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

    // Check if vendor exists
    const vendorCheck = await client.query(
      'SELECT full_name, avatar FROM users WHERE id = $1 AND role = $2',
      [vendorId, 'vendor']
    );

    if (vendorCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Vendor not found',
      });
    }

    const vendorName = vendorCheck.rows[0].full_name;
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
        `,
        [conversationId, member.user_id, member.role, canSend]
      );
    }

    // Add vendor as participant
    await client.query(
      `
      INSERT INTO conversation_participants (conversation_id, user_id, role, can_send)
      VALUES ($1, $2, $3, $4)
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
 * Get all participants in a conversation
 */
export const getConversationParticipants = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    // Check if user is part of this conversation
    const accessCheck = await pool.query(
      'SELECT id FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
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
      name: row.full_name,
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
      'SELECT id FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
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
      SELECT cp.can_send, u.name, u.avatar
      FROM conversation_participants cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.conversation_id = $1 AND cp.user_id = $2
      `,
      [conversationId, userId]
    );

    if (participantCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        error: 'Access denied to this conversation',
      });
    }

    if (!participantCheck.rows[0].can_send) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to send messages in this conversation',
      });
    }

    const senderName = participantCheck.rows[0].full_name;
    const senderAvatar = participantCheck.rows[0].avatar;

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
      req.app.get('io').to(conversationId).emit('new-message', message);
    }

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
      req.app.get('io').to(conversationId).emit('message-deleted', { messageId });
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
        req.app.get('io').to(conversationId).emit('user-typing', {
          userId,
          conversationId,
          isTyping: true,
        });
      }
    } else {
      // Remove typing indicator
      await pool.query(
        'DELETE FROM typing_indicators WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, userId]
      );

      // Emit socket event
      if (req.app.get('io')) {
        req.app.get('io').to(conversationId).emit('user-typing', {
          userId,
          conversationId,
          isTyping: false,
        });
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
      userName: row.full_name,
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
