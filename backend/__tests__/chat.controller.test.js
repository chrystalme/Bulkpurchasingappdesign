/**
 * Chat Controller Tests
 * Tests all REST API endpoints for the chat system.
 */
import { jest } from '@jest/globals';
import mockPool, { setMockQueryResults, resetMocks, mockClient } from './helpers/mockPool.js';

// Mock the database module before importing controllers
jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool,
}));

// Now import after mocking
const {
  getUserConversations,
  getConversationById,
  createGroupVendorConversation,
  getConversationParticipants,
  getMessages,
  sendMessage,
  markAsRead,
  deleteMessage,
  setTypingIndicator,
  getTypingUsers,
  getUnreadCount,
} = await import('../controllers/chat.controller.js');

// Helper to create mock req/res objects
function createMockReq(overrides = {}) {
  return {
    user: { id: 'user-1-uuid' },
    params: {},
    query: {},
    body: {},
    app: { get: () => null },
    ...overrides,
  };
}

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(data) {
      res.body = data;
      return res;
    },
  };
  return res;
}

// ============================================
// TESTS
// ============================================

describe('Chat Controller', () => {
  beforeEach(() => {
    resetMocks();
  });

  // ------------------------------------------
  // getUserConversations
  // ------------------------------------------
  describe('getUserConversations', () => {
    it('should return conversations for the authenticated user', async () => {
      const req = createMockReq();
      const res = createMockRes();

      setMockQueryResults([
        {
          rows: [
            {
              id: 'conv-1',
              type: 'group',
              title: 'Test Group Chat',
              avatar: '💬',
              group_id: 'group-1',
              vendor_id: null,
              product_id: null,
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
              group_name: 'Test Group',
              vendor_name: null,
              vendor_avatar: null,
              is_vendor_online: false,
              last_message: null,
              unread_count: '0',
              typing_users: null,
            },
          ],
        },
      ]);

      await getUserConversations(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe('conv-1');
      expect(res.body.data[0].type).toBe('group');
      expect(res.body.data[0].unreadCount).toBe(0);
    });

    it('should filter by type when provided', async () => {
      const req = createMockReq({ query: { type: 'group-vendor' } });
      const res = createMockRes();

      setMockQueryResults([{ rows: [] }]);
      await getUserConversations(req, res);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(0);
    });

    it('should handle database errors gracefully', async () => {
      const req = createMockReq();
      const res = createMockRes();

      setMockQueryResults([new Error('Database connection failed')]);
      await getUserConversations(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ------------------------------------------
  // getConversationById
  // ------------------------------------------
  describe('getConversationById', () => {
    it('should return a conversation when user is a participant', async () => {
      const req = createMockReq({ params: { conversationId: 'conv-1' } });
      const res = createMockRes();

      setMockQueryResults([
        {
          rows: [
            {
              id: 'conv-1',
              type: 'group',
              title: 'Test Chat',
              avatar: '💬',
              group_id: 'group-1',
              vendor_id: null,
              product_id: null,
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
              group_name: 'Test Group',
              vendor_name: null,
              vendor_avatar: null,
              is_vendor_online: false,
              user_role: 'admin',
              can_send: true,
            },
          ],
        },
      ]);

      await getConversationById(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('conv-1');
      expect(res.body.data.userRole).toBe('admin');
      expect(res.body.data.canSend).toBe(true);
    });

    it('should return 404 when user is not a participant', async () => {
      const req = createMockReq({ params: { conversationId: 'conv-999' } });
      const res = createMockRes();

      setMockQueryResults([{ rows: [] }]);
      await getConversationById(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ------------------------------------------
  // createGroupVendorConversation
  // ------------------------------------------
  describe('createGroupVendorConversation', () => {
    it('should require groupId and vendorId', async () => {
      const req = createMockReq({ body: {} });
      const res = createMockRes();

      await createGroupVendorConversation(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/groupId and vendorId are required/);
    });

    it('should reject non-members', async () => {
      const req = createMockReq({
        body: { groupId: 'group-1', vendorId: 'vendor-1' },
      });
      const res = createMockRes();

      setMockQueryResults([
        // BEGIN
        { rows: [] },
        // group membership check — not a member
        { rows: [] },
        // ROLLBACK
        { rows: [] },
      ]);

      await createGroupVendorConversation(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toMatch(/not a member/);
    });

    it('should reject non-admin group members', async () => {
      const req = createMockReq({
        body: { groupId: 'group-1', vendorId: 'vendor-1' },
      });
      const res = createMockRes();

      setMockQueryResults([
        // BEGIN
        { rows: [] },
        // group membership check — is a member but not admin
        { rows: [{ role: 'member', name: 'Test Group' }] },
        // ROLLBACK
        { rows: [] },
      ]);

      await createGroupVendorConversation(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toMatch(/Only group admins/);
    });

    it('should reject if vendor not found', async () => {
      const req = createMockReq({
        body: { groupId: 'group-1', vendorId: 'vendor-999' },
      });
      const res = createMockRes();

      setMockQueryResults([
        // BEGIN
        { rows: [] },
        // group membership check — admin
        { rows: [{ role: 'admin', name: 'Test Group' }] },
        // vendor check — not found
        { rows: [] },
        // ROLLBACK
        { rows: [] },
      ]);

      await createGroupVendorConversation(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toMatch(/Vendor not found/);
    });

    it('should return existing conversation if already exists', async () => {
      const req = createMockReq({
        body: { groupId: 'group-1', vendorId: 'vendor-1' },
      });
      const res = createMockRes();

      setMockQueryResults([
        // BEGIN
        { rows: [] },
        // group membership check — admin
        { rows: [{ role: 'admin', name: 'Test Group' }] },
        // vendor check — found
        { rows: [{ name: 'Vendor Co', avatar: null }] },
        // existing conversation check — exists
        { rows: [{ id: 'existing-conv-id' }] },
        // COMMIT
        { rows: [] },
      ]);

      await createGroupVendorConversation(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.id).toBe('existing-conv-id');
    });

    it('should create a new group-vendor conversation when admin', async () => {
      const req = createMockReq({
        body: { groupId: 'group-1', vendorId: 'vendor-1', productId: 'prod-1' },
      });
      const res = createMockRes();

      setMockQueryResults([
        // BEGIN
        { rows: [] },
        // group membership check — admin
        { rows: [{ role: 'admin', name: 'Test Group' }] },
        // vendor check — found
        { rows: [{ name: 'Vendor Co', avatar: 'v-avatar.png' }] },
        // existing conversation check — none
        { rows: [] },
        // INSERT conversation
        { rows: [{ id: 'new-conv-id' }] },
        // SELECT group members
        {
          rows: [
            { user_id: 'user-1-uuid', role: 'admin' },
            { user_id: 'user-2-uuid', role: 'member' },
          ],
        },
        // INSERT participant (admin)
        { rows: [] },
        // INSERT participant (member)
        { rows: [] },
        // INSERT vendor participant
        { rows: [] },
        // COMMIT
        { rows: [] },
      ]);

      await createGroupVendorConversation(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('new-conv-id');
      expect(res.body.data.type).toBe('group-vendor');
    });
  });

  // ------------------------------------------
  // getConversationParticipants
  // ------------------------------------------
  describe('getConversationParticipants', () => {
    it('should return participants when user has access', async () => {
      const req = createMockReq({ params: { conversationId: 'conv-1' } });
      const res = createMockRes();

      setMockQueryResults([
        // access check
        { rows: [{ id: 'participant-1' }] },
        // participants query
        {
          rows: [
            {
              user_id: 'user-1',
              role: 'admin',
              can_send: true,
              name: 'Alice',
              avatar: null,
              is_online: true,
            },
            {
              user_id: 'user-2',
              role: 'member',
              can_send: true,
              name: 'Bob',
              avatar: null,
              is_online: false,
            },
          ],
        },
      ]);

      await getConversationParticipants(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].name).toBe('Alice');
      expect(res.body.data[1].name).toBe('Bob');
    });

    it('should deny access when user is not a participant', async () => {
      const req = createMockReq({ params: { conversationId: 'conv-1' } });
      const res = createMockRes();

      setMockQueryResults([{ rows: [] }]);
      await getConversationParticipants(req, res);

      expect(res.statusCode).toBe(403);
    });
  });

  // ------------------------------------------
  // getMessages
  // ------------------------------------------
  describe('getMessages', () => {
    it('should return messages for an accessible conversation', async () => {
      const req = createMockReq({
        params: { conversationId: 'conv-1' },
        query: {},
      });
      const res = createMockRes();

      setMockQueryResults([
        // access check
        { rows: [{ id: 'participant-1' }] },
        // messages query
        {
          rows: [
            {
              id: 'msg-1',
              conversation_id: 'conv-1',
              sender_id: 'user-2',
              content: 'Hello!',
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
              is_deleted: false,
              sender_name: 'Bob',
              sender_avatar: null,
              read: false,
            },
          ],
        },
      ]);

      await getMessages(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].content).toBe('Hello!');
      expect(res.body.data[0].isOwn).toBe(false);
    });

    it('should deny access when user is not a participant', async () => {
      const req = createMockReq({
        params: { conversationId: 'conv-1' },
        query: {},
      });
      const res = createMockRes();

      setMockQueryResults([{ rows: [] }]);
      await getMessages(req, res);

      expect(res.statusCode).toBe(403);
    });
  });

  // ------------------------------------------
  // sendMessage
  // ------------------------------------------
  describe('sendMessage', () => {
    it('should send a message when user has send permission', async () => {
      const mockIo = { to: () => ({ emit: () => {} }) };
      const req = createMockReq({
        params: { conversationId: 'conv-1' },
        body: { content: 'Hello world!' },
        app: { get: (key) => (key === 'io' ? mockIo : null) },
      });
      const res = createMockRes();

      setMockQueryResults([
        // BEGIN
        { rows: [] },
        // participant + permission check
        { rows: [{ can_send: true, name: 'Alice', avatar: null }] },
        // INSERT message
        { rows: [{ id: 'msg-new', created_at: '2026-01-01T00:00:00Z' }] },
        // UPDATE conversation updated_at
        { rows: [] },
        // DELETE typing indicator
        { rows: [] },
        // COMMIT
        { rows: [] },
      ]);

      await sendMessage(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe('Hello world!');
      expect(res.body.data.senderName).toBe('Alice');
    });

    it('should reject empty message content', async () => {
      const req = createMockReq({
        params: { conversationId: 'conv-1' },
        body: { content: '' },
      });
      const res = createMockRes();

      await sendMessage(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/content is required/);
    });

    it('should reject when user does not have send permission', async () => {
      const req = createMockReq({
        params: { conversationId: 'conv-1' },
        body: { content: 'Test' },
      });
      const res = createMockRes();

      setMockQueryResults([
        // BEGIN
        { rows: [] },
        // participant check — can_send is false (read-only member in vendor chat)
        { rows: [{ can_send: false, name: 'Bob', avatar: null }] },
        // ROLLBACK
        { rows: [] },
      ]);

      await sendMessage(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toMatch(/permission to send/);
    });

    it('should reject when user is not a participant', async () => {
      const req = createMockReq({
        params: { conversationId: 'conv-1' },
        body: { content: 'Test' },
      });
      const res = createMockRes();

      setMockQueryResults([
        // BEGIN
        { rows: [] },
        // participant check — not found
        { rows: [] },
        // ROLLBACK
        { rows: [] },
      ]);

      await sendMessage(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toMatch(/Access denied/);
    });
  });

  // ------------------------------------------
  // markAsRead
  // ------------------------------------------
  describe('markAsRead', () => {
    it('should mark conversation as read', async () => {
      const req = createMockReq({ params: { conversationId: 'conv-1' } });
      const res = createMockRes();

      setMockQueryResults([
        { rows: [{ last_read_at: '2026-01-01T12:00:00Z' }] },
      ]);

      await markAsRead(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.conversationId).toBe('conv-1');
    });

    it('should return 403 when not a participant', async () => {
      const req = createMockReq({ params: { conversationId: 'conv-1' } });
      const res = createMockRes();

      setMockQueryResults([{ rows: [] }]);
      await markAsRead(req, res);

      expect(res.statusCode).toBe(403);
    });
  });

  // ------------------------------------------
  // deleteMessage
  // ------------------------------------------
  describe('deleteMessage', () => {
    it('should soft delete a message owned by the user', async () => {
      const mockIo = { to: () => ({ emit: () => {} }) };
      const req = createMockReq({
        params: { messageId: 'msg-1' },
        app: { get: (key) => (key === 'io' ? mockIo : null) },
      });
      const res = createMockRes();

      setMockQueryResults([
        { rows: [{ id: 'msg-1', conversation_id: 'conv-1' }] },
      ]);

      await deleteMessage(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 403 when message not found or not owned', async () => {
      const req = createMockReq({ params: { messageId: 'msg-999' } });
      const res = createMockRes();

      setMockQueryResults([{ rows: [] }]);
      await deleteMessage(req, res);

      expect(res.statusCode).toBe(403);
    });
  });

  // ------------------------------------------
  // setTypingIndicator
  // ------------------------------------------
  describe('setTypingIndicator', () => {
    it('should set typing indicator when isTyping is true', async () => {
      const req = createMockReq({
        params: { conversationId: 'conv-1' },
        body: { isTyping: true },
        app: { get: () => ({ to: () => ({ emit: () => {} }) }) },
      });
      const res = createMockRes();

      setMockQueryResults([{ rows: [] }]);
      await setTypingIndicator(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should clear typing indicator when isTyping is false', async () => {
      const req = createMockReq({
        params: { conversationId: 'conv-1' },
        body: { isTyping: false },
        app: { get: () => ({ to: () => ({ emit: () => {} }) }) },
      });
      const res = createMockRes();

      setMockQueryResults([{ rows: [] }]);
      await setTypingIndicator(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ------------------------------------------
  // getTypingUsers
  // ------------------------------------------
  describe('getTypingUsers', () => {
    it('should return currently typing users', async () => {
      const req = createMockReq({ params: { conversationId: 'conv-1' } });
      const res = createMockRes();

      setMockQueryResults([
        {
          rows: [
            { user_id: 'user-2', name: 'Bob' },
          ],
        },
      ]);

      await getTypingUsers(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].userName).toBe('Bob');
    });
  });

  // ------------------------------------------
  // getUnreadCount
  // ------------------------------------------
  describe('getUnreadCount', () => {
    it('should return total unread count', async () => {
      const req = createMockReq();
      const res = createMockRes();

      setMockQueryResults([
        { rows: [{ total_unread: '5' }] },
      ]);

      await getUnreadCount(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.unreadCount).toBe(5);
    });

    it('should return 0 when no unread messages', async () => {
      const req = createMockReq();
      const res = createMockRes();

      setMockQueryResults([
        { rows: [{ total_unread: '0' }] },
      ]);

      await getUnreadCount(req, res);

      expect(res.body.data.unreadCount).toBe(0);
    });
  });
});
