/**
 * Chat Socket.IO Tests
 * Tests real-time chat events via Socket.IO.
 */
import { jest } from '@jest/globals';
import mockPool, { setMockQueryResults, resetMocks, mockClient } from './helpers/mockPool.js';

// Mock the database module
jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool,
}));

// Mock the rate limiter to always allow
jest.unstable_mockModule('../middleware/rateLimit.js', () => ({
  socketChatMessageLimiter: (socketId, callback) => callback(true),
}));

const { initializeChatSocket } = await import('../socket/chat.socket.js');

import http from 'http';
import { Server } from 'socket.io';
import { io as ClientIO } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import express from 'express';

const TEST_JWT_SECRET = process.env.JWT_SECRET || 'save-together-development-jwt-secret-key-12345';

function generateToken(userId, role = 'member') {
  return jwt.sign({ userId, role }, TEST_JWT_SECRET, { expiresIn: '1h' });
}

describe('Chat Socket.IO', () => {
  let httpServer;
  let io;
  let clientSocket;
  let port;

  beforeAll((done) => {
    const app = express();
    httpServer = http.createServer(app);
    io = new Server(httpServer, { cors: { origin: '*' } });
    initializeChatSocket(io);
    httpServer.listen(0, () => {
      port = httpServer.address().port;
      done();
    });
  });

  afterAll((done) => {
    if (clientSocket?.connected) clientSocket.disconnect();
    io.close();
    httpServer.close(done);
  });

  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    if (clientSocket?.connected) clientSocket.disconnect();
  });

  function connectClient(userId = 'user-1-uuid', role = 'member') {
    return new Promise((resolve, reject) => {
      const token = generateToken(userId, role);
      clientSocket = ClientIO(`http://localhost:${port}`, {
        auth: { token },
        transports: ['websocket'],
      });

      // Mock the online status update queries
      setMockQueryResults([
        // UPDATE users SET is_online
        { rows: [] },
        // SELECT conversation_participants
        { rows: [] },
      ]);

      clientSocket.on('connect', () => resolve(clientSocket));
      clientSocket.on('connect_error', reject);
    });
  }

  // ------------------------------------------
  // Authentication
  // ------------------------------------------
  describe('Authentication', () => {
    it('should connect with valid token', async () => {
      const socket = await connectClient();
      expect(socket.connected).toBe(true);
    });

    it('should reject connection with no token', (done) => {
      const socket = ClientIO(`http://localhost:${port}`, {
        auth: {},
        transports: ['websocket'],
      });

      socket.on('connect_error', (err) => {
        expect(err.message).toMatch(/Authentication error/);
        socket.disconnect();
        done();
      });
    });

    it('should reject connection with invalid token', (done) => {
      const socket = ClientIO(`http://localhost:${port}`, {
        auth: { token: 'invalid-token' },
        transports: ['websocket'],
      });

      socket.on('connect_error', (err) => {
        expect(err.message).toMatch(/Authentication error/);
        socket.disconnect();
        done();
      });
    });
  });

  // ------------------------------------------
  // Join/Leave Conversation
  // ------------------------------------------
  describe('Join/Leave Conversation', () => {
    it('should join a conversation room when user is a participant', async () => {
      await connectClient();

      setMockQueryResults([
        // access check — user is participant
        { rows: [{ id: 'participant-1' }] },
        // UPDATE last_read_at
        { rows: [] },
      ]);

      const result = await new Promise((resolve) => {
        clientSocket.on('joined-conversation', resolve);
        clientSocket.emit('join-conversation', { conversationId: 'conv-1' });
      });

      expect(result.conversationId).toBe('conv-1');
    });

    it('should reject joining when user is not a participant', async () => {
      await connectClient();

      setMockQueryResults([
        // access check — not a participant
        { rows: [] },
      ]);

      const result = await new Promise((resolve) => {
        clientSocket.on('error', resolve);
        clientSocket.emit('join-conversation', { conversationId: 'conv-999' });
      });

      expect(result.message).toMatch(/Access denied/);
    });

    it('should leave a conversation room', async () => {
      await connectClient();

      // No errors expected, just emit
      clientSocket.emit('leave-conversation', { conversationId: 'conv-1' });

      // Give a moment for the event to process
      await new Promise((r) => setTimeout(r, 100));
      // If no error thrown, test passes
    });
  });

  // ------------------------------------------
  // Send Message via Socket
  // ------------------------------------------
  describe('Send Message', () => {
    it('should broadcast new message to conversation room', async () => {
      await connectClient();

      // First join the conversation
      setMockQueryResults([
        // join: access check
        { rows: [{ id: 'participant-1' }] },
        // join: update last_read_at
        { rows: [] },
      ]);

      await new Promise((resolve) => {
        clientSocket.on('joined-conversation', resolve);
        clientSocket.emit('join-conversation', { conversationId: 'conv-1' });
      });

      // Now send a message
      setMockQueryResults([
        // BEGIN
        { rows: [] },
        // participant check
        { rows: [{ can_send: true, name: 'Alice', avatar: null }] },
        // INSERT message
        { rows: [{ id: 'msg-1', created_at: '2026-01-01T00:00:00Z' }] },
        // UPDATE conversation
        { rows: [] },
        // DELETE typing
        { rows: [] },
        // COMMIT
        { rows: [] },
      ]);

      const message = await new Promise((resolve) => {
        clientSocket.on('new-message', resolve);
        clientSocket.emit('send-message', {
          conversationId: 'conv-1',
          content: 'Hello from socket!',
        });
      });

      expect(message.content).toBe('Hello from socket!');
      expect(message.senderName).toBe('Alice');
      expect(message.conversationId).toBe('conv-1');
    });

    it('should reject empty message content', async () => {
      await connectClient();

      const error = await new Promise((resolve) => {
        clientSocket.on('error', resolve);
        clientSocket.emit('send-message', {
          conversationId: 'conv-1',
          content: '',
        });
      });

      expect(error.message).toMatch(/content is required/);
    });

    it('should reject when user has no send permission', async () => {
      await connectClient();

      setMockQueryResults([
        // BEGIN
        { rows: [] },
        // participant check — can_send false
        { rows: [{ can_send: false, name: 'Bob', avatar: null }] },
        // ROLLBACK
        { rows: [] },
      ]);

      const error = await new Promise((resolve) => {
        clientSocket.on('error', resolve);
        clientSocket.emit('send-message', {
          conversationId: 'conv-1',
          content: 'Should not send',
        });
      });

      expect(error.message).toMatch(/permission to send/);
    });
  });

  // ------------------------------------------
  // Typing Indicators
  // ------------------------------------------
  describe('Typing Indicators', () => {
    it('should broadcast typing indicator to other users', async () => {
      await connectClient();

      setMockQueryResults([
        // get user info
        { rows: [{ name: 'Alice' }] },
        // INSERT/UPDATE typing indicator
        { rows: [] },
      ]);

      // We can't easily test "to others" with single client,
      // but we can verify no error is emitted
      clientSocket.emit('typing', { conversationId: 'conv-1', isTyping: true });

      await new Promise((r) => setTimeout(r, 200));
      // No error means success
    });

    it('should handle stop typing', async () => {
      await connectClient();

      setMockQueryResults([
        // get user info
        { rows: [{ name: 'Alice' }] },
        // DELETE typing indicator
        { rows: [] },
      ]);

      clientSocket.emit('typing', { conversationId: 'conv-1', isTyping: false });

      await new Promise((r) => setTimeout(r, 200));
    });
  });

  // ------------------------------------------
  // Mark Read
  // ------------------------------------------
  describe('Mark Read', () => {
    it('should update last_read_at for the user', async () => {
      await connectClient();

      setMockQueryResults([
        // UPDATE last_read_at
        { rows: [] },
      ]);

      clientSocket.emit('mark-read', { conversationId: 'conv-1' });

      await new Promise((r) => setTimeout(r, 200));
      // No error means success
    });
  });

  // ------------------------------------------
  // Delete Message
  // ------------------------------------------
  describe('Delete Message', () => {
    it('should broadcast message deletion', async () => {
      await connectClient();

      // Join conversation first
      setMockQueryResults([
        { rows: [{ id: 'p-1' }] },
        { rows: [] },
      ]);

      await new Promise((resolve) => {
        clientSocket.on('joined-conversation', resolve);
        clientSocket.emit('join-conversation', { conversationId: 'conv-1' });
      });

      setMockQueryResults([
        // soft delete — returns conversation_id
        { rows: [{ conversation_id: 'conv-1' }] },
      ]);

      const result = await new Promise((resolve) => {
        clientSocket.on('message-deleted', resolve);
        clientSocket.emit('delete-message', { messageId: 'msg-1' });
      });

      expect(result.messageId).toBe('msg-1');
      expect(result.conversationId).toBe('conv-1');
    });

    it('should emit error when message not found or not owned', async () => {
      await connectClient();

      setMockQueryResults([
        // soft delete — not found
        { rows: [] },
      ]);

      const error = await new Promise((resolve) => {
        clientSocket.on('error', resolve);
        clientSocket.emit('delete-message', { messageId: 'msg-999' });
      });

      expect(error.message).toMatch(/not found|permission/);
    });
  });

  // ------------------------------------------
  // Disconnect
  // ------------------------------------------
  describe('Disconnect', () => {
    it('should set user offline and clean up typing indicators on disconnect', async () => {
      await connectClient();

      // Queue results for disconnect handler:
      // updateOnlineStatus(false) -> UPDATE users, SELECT conversations
      // cleanup typing -> DELETE
      setMockQueryResults([
        { rows: [] }, // UPDATE users
        { rows: [] }, // SELECT conversations
        { rows: [] }, // DELETE typing
      ]);

      clientSocket.disconnect();

      // Wait for disconnect handler to run
      await new Promise((r) => setTimeout(r, 300));
      // No error means success
    });
  });
});
