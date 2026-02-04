import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { registerChatHandlers } from '../websocket/chat.handlers.js';

let io = null;

// Store active users and their socket connections
const activeUsers = new Map(); // userId -> socketId
const userSockets = new Map(); // socketId -> userId

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
    },
  });

  // Socket.IO authentication middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Attach user info to socket
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      socket.userName = decoded.name;
      
      next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      next(new Error('Invalid authentication token'));
    }
  });

  // Handle socket connections
  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.userName} (ID: ${socket.userId}, Role: ${socket.userRole})`);
    
    // Store user connection
    activeUsers.set(socket.userId, socket.id);
    userSockets.set(socket.id, socket.userId);

    // Join user to their personal room
    socket.join(`user:${socket.userId}`);

    // Emit online status to all connected users
    socket.broadcast.emit('user:online', {
      userId: socket.userId,
      userName: socket.userName,
    });

    // Handle joining conversation rooms
    socket.on('conversation:join', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`👥 User ${socket.userId} joined conversation ${conversationId}`);
    });

    // Handle leaving conversation rooms
    socket.on('conversation:leave', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`👋 User ${socket.userId} left conversation ${conversationId}`);
    });

    // Handle typing indicators
    socket.on('typing:start', ({ conversationId, receiverId }) => {
      socket.to(`conversation:${conversationId}`).emit('user:typing', {
        userId: socket.userId,
        userName: socket.userName,
        conversationId,
      });
    });

    socket.on('typing:stop', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('user:stop_typing', {
        userId: socket.userId,
        conversationId,
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.userName} (ID: ${socket.userId})`);
      
      // Remove user from active users
      activeUsers.delete(socket.userId);
      userSockets.delete(socket.id);

      // Emit offline status
      socket.broadcast.emit('user:offline', {
        userId: socket.userId,
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // Register chat-specific handlers
  registerChatHandlers(io);

  console.log('🔌 Socket.IO initialized');
  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.');
  }
  return io;
};

export const getActiveUsers = () => {
  return Array.from(activeUsers.keys());
};

export const isUserOnline = (userId) => {
  return activeUsers.has(userId);
};

export const emitToUser = (userId, event, data) => {
  const socketId = activeUsers.get(userId);
  if (socketId && io) {
    io.to(socketId).emit(event, data);
    return true;
  }
  return false;
};

export const emitToConversation = (conversationId, event, data) => {
  if (io) {
    io.to(`conversation:${conversationId}`).emit(event, data);
    return true;
  }
  return false;
};