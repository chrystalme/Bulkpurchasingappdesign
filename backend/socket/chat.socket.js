import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { socketChatMessageLimiter } from '../middleware/rateLimit.js';
import { notificationService } from '../services/notifications/index.js';

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

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'save-together-development-jwt-secret-key-12345'
    );
    socket.userId = decoded.userId;
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
          `SELECT c.id 
           FROM conversations c
           LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.user_id = $2
           LEFT JOIN group_members gm ON c.group_id = gm.group_id AND gm.user_id = $2
           WHERE c.id = $1 AND (cp.user_id = $2 OR gm.user_id = $2 OR c.vendor_id = $2)`,
          [conversationId, socket.userId]
        );

        if (accessCheck.rows.length === 0) {
          socket.emit('error', { message: 'Access denied to this conversation' });
          return;
        }

        // Join the room (support both raw ID and prefixed room name)
        socket.join(conversationId);
        socket.join(`conversation:${conversationId}`);
        console.log(`User ${socket.userId} joined conversation ${conversationId}`);

        // Notify others in the room
        socket.to(conversationId).to(`conversation:${conversationId}`).emit('user-joined', {
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
      socket.leave(`conversation:${conversationId}`);
      console.log(`User ${socket.userId} left conversation ${conversationId}`);

      // Notify others
      socket.to(conversationId).to(`conversation:${conversationId}`).emit('user-left', {
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
      // Rate limiting check
      socketChatMessageLimiter(socket.id, async (allowed) => {
        if (!allowed) {
          socket.emit('error', { 
            message: 'Too many messages, please slow down' 
          });
          return;
        }

        // Continue with message sending
        try {
          await handleSendMessage(data);
        } catch (err) {
          console.error('Unhandled error in send-message:', err);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      async function handleSendMessage(data) {
        const client = await pool.connect();
        
        try {
          const { conversationId, content } = data;

          if (!content || content.trim() === '') {
            socket.emit('error', { message: 'Message content is required' });
            return;
          }

          // Validate message length
          if (content.trim().length > 5000) {
            socket.emit('error', { message: 'Message is too long (max 5000 characters)' });
            return;
          }

          await client.query('BEGIN');

          // Check if user can send messages
          const participantCheck = await client.query(
            `SELECT 
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
             WHERE c.id = $1 AND (cp.user_id = $2 OR gm.user_id = $2 OR c.vendor_id = $2)`,
            [conversationId, socket.userId]
          );

          if (participantCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            socket.emit('error', { message: 'Access denied' });
            return;
          }

          const participantRow = participantCheck.rows[0];
          let canSend = participantRow.can_send;
          if (participantRow.conversation_type === 'group-vendor') {
            const isGroupAdmin = participantRow.group_role === 'admin' || participantRow.participant_role === 'admin';
            const isVendor = participantRow.vendor_id === socket.userId || participantRow.participant_role === 'vendor';
            if (!isGroupAdmin && !isVendor) {
              canSend = false;
            } else if (participantRow.participant_can_send === false) {
              canSend = false;
            }
          }

          if (!canSend) {
            await client.query('ROLLBACK');
            socket.emit('error', { 
              message: 'You do not have permission to send messages in this conversation' 
            });
            return;
          }

          const senderName = participantRow.name;
          const senderAvatar = participantRow.avatar;

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
          io.to(conversationId).to(`conversation:${conversationId}`).emit('new-message', message);

          // Notify offline participants via external channels
          notificationService.notifyOfflineParticipants(
            conversationId, socket.userId, senderName, content.trim()
          ).catch(() => {});

          console.log(`Message sent in conversation ${conversationId} by user ${socket.userId}`);
        } catch (error) {
          await client.query('ROLLBACK');
          console.error('Error sending message:', error);
          socket.emit('error', { message: 'Failed to send message' });
        } finally {
          client.release();
        }
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
          'SELECT name FROM users WHERE id = $1',
          [socket.userId]
        );

        if (userResult.rows.length === 0) return;

        const userName = userResult.rows[0].name;

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
        socket.to(conversationId).to(`conversation:${conversationId}`).emit('user-typing', {
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
        socket.to(conversationId).to(`conversation:${conversationId}`).emit('messages-read', {
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
        io.to(conversationId).to(`conversation:${conversationId}`).emit('message-deleted', {
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

  // Clean up expired typing indicators every 10 seconds.
  // Uses a self-scheduling setTimeout instead of setInterval so a slow
  // query (e.g. during a PG restart / reconnect) never stacks overlapping
  // calls, which would exhaust the pool and cascade connection timeouts.
  let cleanupRunning = false;
  const cleanupTypingIndicators = async () => {
    if (cleanupRunning) return;
    cleanupRunning = true;
    try {
      await pool.query('DELETE FROM typing_indicators WHERE expires_at < CURRENT_TIMESTAMP');
    } catch (error) {
      // Transient reconnection failures are expected after sleep/restart —
      // the pool reconnects on the next run. Log and move on.
      console.error('Error cleaning typing indicators:', error);
    } finally {
      cleanupRunning = false;
      if (process.env.NODE_ENV !== 'test') {
        setTimeout(cleanupTypingIndicators, 10000);
      }
    }
  };
  if (process.env.NODE_ENV !== 'test') {
    cleanupTypingIndicators();
  }

  console.log('Chat Socket.IO initialized');
};

export { initializeChatSocket };
