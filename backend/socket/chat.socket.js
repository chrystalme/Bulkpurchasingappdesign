import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

/**
 * Socket.IO Chat Handler
 * Handles real-time chat events: messages, typing indicators, read receipts
 */

// Authenticate socket connections
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication error: Invalid token'));
  }
};

// Initialize Socket.IO for chat
const initializeChatSocket = (io) => {
  // Apply authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // ============================================
    // JOIN/LEAVE CONVERSATION ROOMS
    // ============================================

    /**
     * Join conversation room
     * Client emits: { conversationId }
     */
    socket.on('join-conversation', async (data) => {
      try {
        const { conversationId } = data;

        // Verify user has access to this conversation
        const accessCheck = await pool.query(
          'SELECT id FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
          [conversationId, socket.userId]
        );

        if (accessCheck.rows.length === 0) {
          socket.emit('error', { message: 'Access denied to this conversation' });
          return;
        }

        // Join the room
        socket.join(conversationId);
        console.log(`User ${socket.userId} joined conversation ${conversationId}`);

        // Notify others in the room
        socket.to(conversationId).emit('user-joined', {
          userId: socket.userId,
          conversationId,
        });

        // Mark conversation as read
        await pool.query(
          `UPDATE conversation_participants 
           SET last_read_at = CURRENT_TIMESTAMP 
           WHERE conversation_id = $1 AND user_id = $2`,
          [conversationId, socket.userId]
        );

        socket.emit('joined-conversation', { conversationId });
      } catch (error) {
        console.error('Error joining conversation:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    /**
     * Leave conversation room
     * Client emits: { conversationId }
     */
    socket.on('leave-conversation', (data) => {
      const { conversationId } = data;
      socket.leave(conversationId);
      console.log(`User ${socket.userId} left conversation ${conversationId}`);

      // Notify others
      socket.to(conversationId).emit('user-left', {
        userId: socket.userId,
        conversationId,
      });
    });

    // ============================================
    // SEND MESSAGE
    // ============================================

    /**
     * Send message
     * Client emits: { conversationId, content }
     */
    socket.on('send-message', async (data) => {
      const client = await pool.connect();
      
      try {
        const { conversationId, content } = data;

        if (!content || content.trim() === '') {
          socket.emit('error', { message: 'Message content is required' });
          return;
        }

        await client.query('BEGIN');

        // Check if user can send messages
        const participantCheck = await client.query(
          `SELECT cp.can_send, u.full_name, u.avatar
           FROM conversation_participants cp
           JOIN users u ON cp.user_id = u.id
           WHERE cp.conversation_id = $1 AND cp.user_id = $2`,
          [conversationId, socket.userId]
        );

        if (participantCheck.rows.length === 0) {
          await client.query('ROLLBACK');
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        if (!participantCheck.rows[0].can_send) {
          await client.query('ROLLBACK');
          socket.emit('error', { 
            message: 'You do not have permission to send messages in this conversation' 
          });
          return;
        }

        const senderName = participantCheck.rows[0].full_name;
        const senderAvatar = participantCheck.rows[0].avatar;

        // Insert message
        const messageResult = await client.query(
          `INSERT INTO messages (conversation_id, sender_id, content)
           VALUES ($1, $2, $3)
           RETURNING id, created_at`,
          [conversationId, socket.userId, content.trim()]
        );

        const messageId = messageResult.rows[0].id;
        const createdAt = messageResult.rows[0].created_at;

        // Update conversation timestamp
        await client.query(
          'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [conversationId]
        );

        // Clear typing indicator
        await client.query(
          'DELETE FROM typing_indicators WHERE conversation_id = $1 AND user_id = $2',
          [conversationId, socket.userId]
        );

        await client.query('COMMIT');

        const message = {
          id: messageId,
          conversationId,
          senderId: socket.userId,
          senderName,
          senderAvatar,
          content: content.trim(),
          timestamp: createdAt,
          read: false,
        };

        // Broadcast to all users in the conversation (including sender)
        io.to(conversationId).emit('new-message', message);

        console.log(`Message sent in conversation ${conversationId} by user ${socket.userId}`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      } finally {
        client.release();
      }
    });

    // ============================================
    // TYPING INDICATORS
    // ============================================

    /**
     * Typing indicator
     * Client emits: { conversationId, isTyping: boolean }
     */
    socket.on('typing', async (data) => {
      try {
        const { conversationId, isTyping } = data;

        // Get user info
        const userResult = await pool.query(
          'SELECT full_name FROM users WHERE id = $1',
          [socket.userId]
        );

        if (userResult.rows.length === 0) return;

        const userName = userResult.rows[0].full_name;

        if (isTyping) {
          // Add typing indicator
          await pool.query(
            `INSERT INTO typing_indicators (conversation_id, user_id, expires_at)
             VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '5 seconds')
             ON CONFLICT (conversation_id, user_id)
             DO UPDATE SET expires_at = CURRENT_TIMESTAMP + INTERVAL '5 seconds'`,
            [conversationId, socket.userId]
          );
        } else {
          // Remove typing indicator
          await pool.query(
            'DELETE FROM typing_indicators WHERE conversation_id = $1 AND user_id = $2',
            [conversationId, socket.userId]
          );
        }

        // Broadcast to others in the room (not to sender)
        socket.to(conversationId).emit('user-typing', {
          userId: socket.userId,
          userName,
          conversationId,
          isTyping,
        });
      } catch (error) {
        console.error('Error handling typing indicator:', error);
      }
    });

    // ============================================
    // READ RECEIPTS
    // ============================================

    /**
     * Mark messages as read
     * Client emits: { conversationId }
     */
    socket.on('mark-read', async (data) => {
      try {
        const { conversationId } = data;

        // Update last_read_at
        await pool.query(
          `UPDATE conversation_participants
           SET last_read_at = CURRENT_TIMESTAMP
           WHERE conversation_id = $1 AND user_id = $2`,
          [conversationId, socket.userId]
        );

        // Notify others that this user has read messages
        socket.to(conversationId).emit('messages-read', {
          userId: socket.userId,
          conversationId,
          readAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    });

    // ============================================
    // DELETE MESSAGE
    // ============================================

    /**
     * Delete message
     * Client emits: { messageId }
     */
    socket.on('delete-message', async (data) => {
      try {
        const { messageId } = data;

        // Soft delete message
        const result = await pool.query(
          `UPDATE messages
           SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
           WHERE id = $1 AND sender_id = $2
           RETURNING conversation_id`,
          [messageId, socket.userId]
        );

        if (result.rows.length === 0) {
          socket.emit('error', { message: 'Message not found or permission denied' });
          return;
        }

        const conversationId = result.rows[0].conversation_id;

        // Broadcast deletion to all users in conversation
        io.to(conversationId).emit('message-deleted', {
          messageId,
          conversationId,
        });
      } catch (error) {
        console.error('Error deleting message:', error);
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    // ============================================
    // UPDATE USER ONLINE STATUS
    // ============================================

    /**
     * Update user online status
     */
    const updateOnlineStatus = async (isOnline) => {
      try {
        await pool.query(
          'UPDATE users SET is_online = $1, last_seen = CURRENT_TIMESTAMP WHERE id = $2',
          [isOnline, socket.userId]
        );

        // Get all conversations this user is in
        const conversations = await pool.query(
          'SELECT conversation_id FROM conversation_participants WHERE user_id = $1',
          [socket.userId]
        );

        // Broadcast online status to all their conversations
        conversations.rows.forEach(row => {
          socket.to(row.conversation_id).emit('user-online-status', {
            userId: socket.userId,
            isOnline,
          });
        });
      } catch (error) {
        console.error('Error updating online status:', error);
      }
    };

    // Set user online when they connect
    updateOnlineStatus(true);

    // ============================================
    // DISCONNECT
    // ============================================

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      
      // Set user offline
      updateOnlineStatus(false);

      // Clean up typing indicators
      pool.query(
        'DELETE FROM typing_indicators WHERE user_id = $1',
        [socket.userId]
      ).catch(err => console.error('Error cleaning typing indicators:', err));
    });

    // ============================================
    // ERROR HANDLING
    // ============================================

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // ============================================
  // PERIODIC CLEANUP
  // ============================================

  // Clean up expired typing indicators every 10 seconds
  setInterval(async () => {
    try {
      await pool.query('DELETE FROM typing_indicators WHERE expires_at < CURRENT_TIMESTAMP');
    } catch (error) {
      console.error('Error cleaning typing indicators:', error);
    }
  }, 10000);

  console.log('Chat Socket.IO initialized');
};

export { initializeChatSocket };
