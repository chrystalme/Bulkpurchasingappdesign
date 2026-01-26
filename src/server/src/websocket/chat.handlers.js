/**
 * WebSocket Event Handlers for Chat
 * This file contains all real-time chat event handlers
 */

import pool from '../config/database.js';
import { emitToUser, emitToConversation } from '../config/socket.js';

/**
 * Register all chat-related WebSocket event handlers
 * @param {Socket} io - Socket.IO server instance
 */
export const registerChatHandlers = (io) => {
  io.on('connection', (socket) => {
    
    /**
     * Handle joining a conversation room
     * Allows users to receive real-time messages for a specific conversation
     */
    socket.on('chat:join_conversation', async ({ conversationId }) => {
      try {
        // Verify user is part of this conversation
        const result = await pool.query(
          `SELECT * FROM conversations 
           WHERE id = $1 AND (vendor_id = $2 OR member_id = $2)`,
          [conversationId, socket.userId]
        );

        if (result.rows.length === 0) {
          socket.emit('error', { 
            message: 'Access denied to this conversation',
            event: 'chat:join_conversation'
          });
          return;
        }

        // Join the conversation room
        socket.join(`conversation:${conversationId}`);
        
        console.log(`👥 User ${socket.userId} joined conversation ${conversationId}`);
        
        socket.emit('chat:joined_conversation', { conversationId });
        
        // Notify other party that user is online in this conversation
        socket.to(`conversation:${conversationId}`).emit('chat:user_joined', {
          userId: socket.userId,
          userName: socket.userName,
          conversationId
        });
      } catch (error) {
        console.error('Error joining conversation:', error);
        socket.emit('error', { 
          message: 'Failed to join conversation',
          event: 'chat:join_conversation'
        });
      }
    });

    /**
     * Handle leaving a conversation room
     */
    socket.on('chat:leave_conversation', ({ conversationId }) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`👋 User ${socket.userId} left conversation ${conversationId}`);
      
      // Notify other party that user left
      socket.to(`conversation:${conversationId}`).emit('chat:user_left', {
        userId: socket.userId,
        conversationId
      });
    });

    /**
     * Handle typing indicator start
     */
    socket.on('chat:typing_start', async ({ conversationId }) => {
      try {
        // Verify user is part of this conversation
        const result = await pool.query(
          `SELECT * FROM conversations 
           WHERE id = $1 AND (vendor_id = $2 OR member_id = $2)`,
          [conversationId, socket.userId]
        );

        if (result.rows.length === 0) {
          return;
        }

        // Emit to other users in the conversation
        socket.to(`conversation:${conversationId}`).emit('chat:user_typing', {
          userId: socket.userId,
          userName: socket.userName,
          conversationId
        });
      } catch (error) {
        console.error('Error handling typing indicator:', error);
      }
    });

    /**
     * Handle typing indicator stop
     */
    socket.on('chat:typing_stop', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('chat:user_stopped_typing', {
        userId: socket.userId,
        conversationId
      });
    });

    /**
     * Handle real-time message sending (for instant delivery)
     * Note: Messages should still be saved via REST API for persistence
     */
    socket.on('chat:send_message', async ({ conversationId, messageText }) => {
      try {
        // Verify user is part of this conversation
        const convResult = await pool.query(
          `SELECT * FROM conversations 
           WHERE id = $1 AND (vendor_id = $2 OR member_id = $2)`,
          [conversationId, socket.userId]
        );

        if (convResult.rows.length === 0) {
          socket.emit('error', { 
            message: 'Access denied to this conversation',
            event: 'chat:send_message'
          });
          return;
        }

        const conversation = convResult.rows[0];

        // Insert message into database
        const messageResult = await pool.query(
          `INSERT INTO messages (conversation_id, sender_id, message_text)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [conversationId, socket.userId, messageText]
        );

        // Update conversation's last_message_at
        await pool.query(
          `UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [conversationId]
        );

        const message = messageResult.rows[0];

        // Create message with sender info
        const messageWithSender = {
          ...message,
          sender_name: socket.userName,
          sender_avatar: null, // Can be fetched if needed
        };

        // Emit to all users in the conversation (including sender for confirmation)
        io.to(`conversation:${conversationId}`).emit('chat:message_received', messageWithSender);

        // Determine recipient
        const recipientId = conversation.vendor_id === socket.userId 
          ? conversation.member_id 
          : conversation.vendor_id;

        // If recipient is not in the conversation room, send direct notification
        emitToUser(recipientId, 'chat:new_message_notification', {
          conversationId,
          message: messageWithSender,
          senderName: socket.userName
        });

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { 
          message: 'Failed to send message',
          event: 'chat:send_message'
        });
      }
    });

    /**
     * Handle marking messages as read in real-time
     */
    socket.on('chat:mark_read', async ({ conversationId, messageIds }) => {
      try {
        // Verify user is part of this conversation
        const convResult = await pool.query(
          `SELECT * FROM conversations 
           WHERE id = $1 AND (vendor_id = $2 OR member_id = $2)`,
          [conversationId, socket.userId]
        );

        if (convResult.rows.length === 0) {
          return;
        }

        const conversation = convResult.rows[0];

        // Mark messages as read
        if (messageIds && messageIds.length > 0) {
          await pool.query(
            `UPDATE messages 
             SET is_read = true 
             WHERE id = ANY($1) AND sender_id != $2`,
            [messageIds, socket.userId]
          );
        } else {
          // Mark all unread messages in conversation as read
          await pool.query(
            `UPDATE messages 
             SET is_read = true 
             WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false`,
            [conversationId, socket.userId]
          );
        }

        // Notify the sender that their messages were read
        const senderId = conversation.vendor_id === socket.userId 
          ? conversation.member_id 
          : conversation.vendor_id;

        emitToUser(senderId, 'chat:messages_read', {
          conversationId,
          messageIds,
          readBy: socket.userId
        });

      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    /**
     * Handle requesting conversation history
     */
    socket.on('chat:get_history', async ({ conversationId, limit = 50, offset = 0 }) => {
      try {
        // Verify user is part of this conversation
        const convResult = await pool.query(
          `SELECT * FROM conversations 
           WHERE id = $1 AND (vendor_id = $2 OR member_id = $2)`,
          [conversationId, socket.userId]
        );

        if (convResult.rows.length === 0) {
          socket.emit('error', { 
            message: 'Access denied to this conversation',
            event: 'chat:get_history'
          });
          return;
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

        socket.emit('chat:history', {
          conversationId,
          messages: messages.rows.reverse(),
          hasMore: messages.rows.length === limit
        });

      } catch (error) {
        console.error('Error fetching chat history:', error);
        socket.emit('error', { 
          message: 'Failed to fetch chat history',
          event: 'chat:get_history'
        });
      }
    });

  });
};

export default registerChatHandlers;
