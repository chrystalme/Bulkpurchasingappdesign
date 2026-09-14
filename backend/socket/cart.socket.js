import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUUID = (val) => typeof val === 'string' && UUID_REGEX.test(val.trim());

/**
 * Socket.IO Cart Handler
 * Handles real-time group cart synchronization and room management
 */

// Authenticate socket connections if not already authenticated
const authenticateCartSocket = async (socket, next) => {
  if (socket.userId) {
    return next();
  }

  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

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
    console.error('Socket authentication error in cart socket:', error);
    next(new Error('Authentication error: Invalid token'));
  }
};

/**
 * Initialize Socket.IO handlers for cart
 */
export const initializeCartSocket = (io) => {
  // Apply socket auth middleware
  io.use(authenticateCartSocket);

  io.on('connection', (socket) => {
    // ============================================
    // JOIN/LEAVE CART ROOMS
    // ============================================

    /**
     * Join group cart room
     * Client emits: { groupId }
     */
    socket.on('join-cart', async (data) => {
      try {
        const { groupId } = data || {};

        if (!groupId) {
          socket.emit('error', { message: 'Group ID is required to join cart room' });
          return;
        }

        if (!isValidUUID(groupId)) {
          socket.emit('error', { message: 'Invalid group ID format' });
          return;
        }

        const userId = socket.userId;
        if (!userId || !isValidUUID(userId)) {
          socket.emit('error', { message: 'Unauthenticated socket or invalid user ID' });
          return;
        }

        // Verify user is an active member in group_members
        const memberCheck = await pool.query(
          'SELECT id, role FROM group_members WHERE group_id = $1 AND user_id = $2',
          [groupId, userId]
        );

        if (memberCheck.rows.length === 0) {
          socket.emit('error', {
            message: 'Access denied: not a member of this group',
            groupId,
          });
          return;
        }

        const roomName = `cart:${groupId}`;
        socket.join(roomName);
        console.log(`User ${userId} joined cart room ${roomName}`);

        socket.emit('joined-cart', { groupId });
      } catch (error) {
        console.error('Error in join-cart socket handler:', error);
        socket.emit('error', { message: 'Failed to join cart room' });
      }
    });

    /**
     * Leave group cart room
     * Client emits: { groupId }
     */
    socket.on('leave-cart', (data) => {
      try {
        const { groupId } = data || {};
        if (!groupId || !isValidUUID(groupId)) return;

        const roomName = `cart:${groupId}`;
        socket.leave(roomName);
        console.log(`User ${socket.userId} left cart room ${roomName}`);

        socket.emit('left-cart', { groupId });
      } catch (error) {
        console.error('Error in leave-cart socket handler:', error);
      }
    });
  });
};

export default initializeCartSocket;
