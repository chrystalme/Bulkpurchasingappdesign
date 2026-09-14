import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ClientIO } from 'socket.io-client';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import pool from '../config/database.js';
import cartRoutes from '../routes/cart.routes.js';
import chatRoutes from '../routes/chat.routes.js';
import { initializeCartSocket } from '../socket/cart.socket.js';
import { initializeChatSocket } from '../socket/chat.socket.js';
import { getCartData } from '../controllers/cart.controller.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'save-together-development-jwt-secret-key-12345';

function generateToken(userId, role = 'member') {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '1h' });
}

describe('Cart Retrieval, Socket UUID Validation & Chat Permissions', () => {
  let app;
  let httpServer;
  let io;
  let serverPort;

  let memberUser;
  let memberToken;
  let leavingUser;
  let leavingToken;
  let testGroup;
  let testProduct;

  let clientSocket;

  beforeAll(async () => {
    // 0. Clean up any leftover users from previous test runs
    await pool.query(`DELETE FROM users WHERE email LIKE 'cart_admin_downgrade%' OR email IN ('cart_retrieval_mem@example.com', 'cart_retrieval_leaver@example.com')`);

    // 1. Create test users
    const userRes = await pool.query(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES 
        ('cart_retrieval_mem@example.com', 'dummyhash', 'Cart Member', 'member'),
        ('cart_retrieval_leaver@example.com', 'dummyhash', 'Cart Leaver', 'member')
      RETURNING id, email, role;
    `);
    memberUser = userRes.rows.find(u => u.email === 'cart_retrieval_mem@example.com');
    leavingUser = userRes.rows.find(u => u.email === 'cart_retrieval_leaver@example.com');

    memberToken = generateToken(memberUser.id, memberUser.role);
    leavingToken = generateToken(leavingUser.id, leavingUser.role);

    // 2. Create a test group with both users as members
    const groupRes = await pool.query(`
      INSERT INTO groups (name, join_code, moq_target, status, created_by)
      VALUES ('Cart Retrieval Group', 'CARTRETRIEVAL1', 20, 'active', $1)
      RETURNING id, name;
    `, [memberUser.id]);
    testGroup = groupRes.rows[0];

    await pool.query(`
      INSERT INTO group_members (group_id, user_id, role)
      VALUES 
        ($1, $2, 'member'),
        ($1, $3, 'member');
    `, [testGroup.id, memberUser.id, leavingUser.id]);

    // 3. Get product
    const prodRes = await pool.query(`SELECT id, name FROM products LIMIT 1;`);
    testProduct = prodRes.rows[0];

    // 4. Setup Express & Socket.IO server
    app = express();
    app.use(express.json());
    httpServer = http.createServer(app);

    io = new Server(httpServer, { cors: { origin: '*' } });
    app.set('io', io);

    app.use('/api/groups/:groupId/cart', cartRoutes);
    app.use('/api/chat', chatRoutes);
    initializeCartSocket(io);
    initializeChatSocket(io);

    await new Promise((resolve) => {
      httpServer.listen(0, () => {
        serverPort = httpServer.address().port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }

    if (testGroup?.id) {
      await pool.query('DELETE FROM group_cart_items WHERE group_id = $1', [testGroup.id]);
      await pool.query('DELETE FROM groups WHERE id = $1', [testGroup.id]);
    }
    if (memberUser?.id) {
      await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [memberUser.id, leavingUser.id]);
    }

    if (io) io.close();
    if (httpServer) await new Promise((resolve) => httpServer.close(resolve));
  });

  // -------------------------------------------------------------
  // Test 1: Cart item id included in response
  // -------------------------------------------------------------
  test('GET /api/groups/:groupId/cart returns cart items with id, productId, quantity, and allocations', async () => {
    // Member adds item
    const postRes = await request(app)
      .post(`/api/groups/${testGroup.id}/cart/items`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ productId: testProduct.id, quantity: 3 });

    expect(postRes.status).toBe(201);
    expect(postRes.body.data.items[0]).toHaveProperty('id');
    expect(typeof postRes.body.data.items[0].id).toBe('string');
    expect(postRes.body.data.items[0].id).toMatch(/^[0-9a-f-]{36}$/i);

    // Fetch cart
    const getRes = await request(app)
      .get(`/api/groups/${testGroup.id}/cart`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    const item = getRes.body.data.items[0];
    expect(item).toBeDefined();
    expect(item).toHaveProperty('id');
    expect(item.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(item.productId).toBe(testProduct.id);
    expect(item.quantity).toBe(3);
    expect(Array.isArray(item.allocations)).toBe(true);
    expect(item.allocations).toHaveLength(1);
    expect(item.allocations[0].memberId).toBe(memberUser.id);
  });

  // -------------------------------------------------------------
  // Test 2: Allocation parsing handles string-serialized JSON
  // -------------------------------------------------------------
  test('getCartData parses string-serialized JSON allocations cleanly', async () => {
    // Mock customPool returning string-serialized allocations
    const mockPool = {
      query: async () => ({
        rows: [
          {
            id: '11111111-1111-1111-1111-111111111111',
            productId: testProduct.id,
            quantity: 5,
            allocations: JSON.stringify([
              {
                id: '22222222-2222-2222-2222-222222222222',
                memberId: memberUser.id,
                memberName: 'Cart Member',
                memberAvatar: null,
                quantity: '5',
                paid: false,
              },
            ]),
          },
        ],
      }),
    };

    const parsed = await getCartData(testGroup.id, mockPool);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe('11111111-1111-1111-1111-111111111111');
    expect(Array.isArray(parsed[0].allocations)).toBe(true);
    expect(parsed[0].allocations).toHaveLength(1);
    expect(parsed[0].allocations[0].quantity).toBe(5);
    expect(parsed[0].allocations[0].memberId).toBe(memberUser.id);
  });

  // -------------------------------------------------------------
  // Test 3: Orphaned allocations from removed users are filtered out
  // -------------------------------------------------------------
  test('Allocations for users who are no longer members of the group are excluded from response', async () => {
    // Leaver adds 2 units
    await request(app)
      .post(`/api/groups/${testGroup.id}/cart/items`)
      .set('Authorization', `Bearer ${leavingToken}`)
      .send({ productId: testProduct.id, quantity: 2 });

    // Verify both allocations are initially visible
    const beforeRes = await request(app)
      .get(`/api/groups/${testGroup.id}/cart`)
      .set('Authorization', `Bearer ${memberToken}`);

    const beforeItem = beforeRes.body.data.items[0];
    expect(beforeItem.allocations).toHaveLength(2);

    // Now remove leavingUser from group_members
    await pool.query(
      'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
      [testGroup.id, leavingUser.id]
    );

    // Fetch cart again as memberUser
    const afterRes = await request(app)
      .get(`/api/groups/${testGroup.id}/cart`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(afterRes.status).toBe(200);
    const afterItem = afterRes.body.data.items[0];
    // LeavingUser's allocation must be filtered out!
    expect(afterItem.allocations).toHaveLength(1);
    expect(afterItem.allocations[0].memberId).toBe(memberUser.id);
    expect(afterItem.allocations.some(a => a.memberId === leavingUser.id)).toBe(false);
  });

  // -------------------------------------------------------------
  // Test 4: Socket UUID validation prevents PostgreSQL 22P02 error
  // -------------------------------------------------------------
  test('Cart socket join-cart validates UUID format and rejects invalid UUID with error event', async () => {
    clientSocket = ClientIO(`http://localhost:${serverPort}`, {
      auth: { token: memberToken },
      transports: ['websocket'],
    });

    await new Promise((resolve) => clientSocket.on('connect', resolve));

    const errorPromise = new Promise((resolve) => {
      clientSocket.on('error', (err) => resolve(err));
    });

    // Emit join-cart with non-UUID groupId
    clientSocket.emit('join-cart', { groupId: 'invalid-not-a-uuid' });

    const err = await errorPromise;
    expect(err).toBeDefined();
    expect(err.message).toMatch(/Invalid group ID format/i);
  });

  // -------------------------------------------------------------
  // Test 5: Internal group chats grant canSend: true to regular members
  // -------------------------------------------------------------
  test('Internal group chat (type: group) gives regular members canSend: true, while group-vendor gives canSend: false', async () => {
    // Fetch or create internal group chat (trigger auto-creates one on group creation)
    let internalConvoRes = await pool.query(
      `SELECT id, type FROM conversations WHERE group_id = $1 AND type = 'group'`,
      [testGroup.id]
    );
    let internalConvoId;
    if (internalConvoRes.rows.length === 0) {
      const insertRes = await pool.query(`
        INSERT INTO conversations (type, title, group_id)
        VALUES ('group', 'Internal Test Chat', $1)
        RETURNING id, type;
      `, [testGroup.id]);
      internalConvoId = insertRes.rows[0].id;
    } else {
      internalConvoId = internalConvoRes.rows[0].id;
    }

    // Create a group-vendor chat with an admin and vendor
    const vendorUserRes = await pool.query(`SELECT id FROM users WHERE role = 'vendor' LIMIT 1;`);
    const vendorUserId = vendorUserRes.rows[0]?.id || memberUser.id;

    const vendorConvoRes = await pool.query(`
      INSERT INTO conversations (type, title, group_id, vendor_id)
      VALUES ('group-vendor', 'Vendor Test Chat', $1, $2)
      RETURNING id, type;
    `, [testGroup.id, vendorUserId]);
    const vendorConvoId = vendorConvoRes.rows[0].id;

    // Member (non-admin) calls GET /api/chat/conversations
    const convosRes = await request(app)
      .get(`/api/chat/conversations?groupId=${testGroup.id}`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(convosRes.status).toBe(200);
    const internalChat = convosRes.body.data.find(c => c.id === internalConvoId);
    const vendorChat = convosRes.body.data.find(c => c.id === vendorConvoId);

    expect(internalChat).toBeDefined();
    expect(internalChat.canSend).toBe(true);

    if (vendorChat) {
      expect(vendorChat.canSend).toBe(false);
    }

    // Call GET /api/chat/conversations/:id for internal conversation
    const singleInternalRes = await request(app)
      .get(`/api/chat/conversations/${internalConvoId}`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(singleInternalRes.status).toBe(200);
    expect(singleInternalRes.body.data.canSend).toBe(true);
  });

  // -------------------------------------------------------------
  // Test 6: Dynamic admin downgrade immediately revokes vendor chat send permission
  // -------------------------------------------------------------
  test('Dynamic admin downgrade (admin -> member in group_members) immediately revokes send permission in group-vendor chat', async () => {
    const timestamp = Date.now();
    const adminEmail = `cart_admin_downgrade_${timestamp}@example.com`;
    const joinCode = `ADM_${timestamp}`.slice(0, 15);

    let adminUserId = null;
    let testGroup2Id = null;
    let vendorConvoId = null;

    try {
      // 1. Create an admin user for the group
      const adminRes = await pool.query(`
        INSERT INTO users (email, password_hash, name, role)
        VALUES ($1, 'dummyhash', 'Admin Downgrade', 'member')
        RETURNING id, email, role;
      `, [adminEmail]);
      const adminUser = adminRes.rows[0];
      adminUserId = adminUser.id;
      const adminTok = generateToken(adminUser.id, adminUser.role);

      // Create a dedicated isolated test group
      const testGroup2Res = await pool.query(`
        INSERT INTO groups (name, join_code, moq_target, status, created_by)
        VALUES ('Admin Downgrade Test Group', $1, 10, 'active', $2)
        RETURNING id;
      `, [joinCode, adminUserId]);
      testGroup2Id = testGroup2Res.rows[0].id;

      // Add as admin in group_members
      await pool.query(`
        INSERT INTO group_members (group_id, user_id, role)
        VALUES ($1, $2, 'admin');
      `, [testGroup2Id, adminUserId]);

      // Create a group-vendor chat
      const vendorUserRes = await pool.query(`SELECT id FROM users WHERE role = 'vendor' LIMIT 1;`);
      const vendorUserId = vendorUserRes.rows[0]?.id || memberUser.id;

      const vendorConvoRes = await pool.query(`
        INSERT INTO conversations (type, title, group_id, vendor_id)
        VALUES ('group-vendor', 'Admin Downgrade Test Chat', $1, $2)
        RETURNING id, type;
      `, [testGroup2Id, vendorUserId]);
      vendorConvoId = vendorConvoRes.rows[0].id;

      // As admin, verify canSend is true
      const checkAdminRes = await request(app)
        .get(`/api/chat/conversations/${vendorConvoId}`)
        .set('Authorization', `Bearer ${adminTok}`);
      expect(checkAdminRes.status).toBe(200);
      expect(checkAdminRes.body.data.canSend).toBe(true);

      // Can send message
      const sendAsAdminRes = await request(app)
        .post(`/api/chat/conversations/${vendorConvoId}/messages`)
        .set('Authorization', `Bearer ${adminTok}`)
        .send({ content: 'Message from admin before downgrade' });
      expect(sendAsAdminRes.status).toBe(201);

      // Now downgrade the user from 'admin' to 'member' in group_members
      await pool.query(`
        UPDATE group_members
        SET role = 'member'
        WHERE group_id = $1 AND user_id = $2;
      `, [testGroup2Id, adminUserId]);

      // Now fetch conversation again: canSend MUST be false
      const checkDowngradedRes = await request(app)
        .get(`/api/chat/conversations/${vendorConvoId}`)
        .set('Authorization', `Bearer ${adminTok}`);
      expect(checkDowngradedRes.status).toBe(200);
      expect(checkDowngradedRes.body.data.canSend).toBe(false);

      // Attempting to send message MUST fail with 403 Forbidden
      const sendAfterDowngradeRes = await request(app)
        .post(`/api/chat/conversations/${vendorConvoId}/messages`)
        .set('Authorization', `Bearer ${adminTok}`)
        .send({ content: 'Attempted message after downgrade' });
      expect(sendAfterDowngradeRes.status).toBe(403);
      expect(sendAfterDowngradeRes.body.error).toMatch(/permission/i);
    } finally {
      // Cleanup
      if (testGroup2Id) {
        await pool.query('DELETE FROM group_members WHERE group_id = $1', [testGroup2Id]);
        if (vendorConvoId) {
          await pool.query('DELETE FROM conversations WHERE id = $1', [vendorConvoId]);
        }
        await pool.query('DELETE FROM groups WHERE id = $1', [testGroup2Id]);
      }
      if (adminUserId) {
        await pool.query('DELETE FROM users WHERE id = $1', [adminUserId]);
      }
    }
  });

  // -------------------------------------------------------------
  // Test 7: Adversarial cart socket inputs never trigger PostgreSQL 22P02
  // -------------------------------------------------------------
  test('Cart socket join-cart and leave-cart with malicious/corrupted inputs do not trigger unhandled errors', async () => {
    const maliciousInputs = [
      '',
      '   ',
      null,
      12345,
      true,
      { malicious: 'object' },
      "'; DROP TABLE group_cart_items; --",
      '00000000-0000-0000-0000-00000000000Z',
      'a'.repeat(2000),
    ];

    for (const badInput of maliciousInputs) {
      const errPromise = new Promise((resolve) => {
        const handler = (err) => {
          clientSocket.off('error', handler);
          resolve(err);
        };
        clientSocket.on('error', handler);
      });

      clientSocket.emit('join-cart', { groupId: badInput });
      const err = await errPromise;
      expect(err).toBeDefined();
      expect(err.message).toMatch(/(Group ID is required|Invalid group ID format)/i);

      // Also verify leave-cart does not throw or crash
      clientSocket.emit('leave-cart', { groupId: badInput });
    }
  });

  // -------------------------------------------------------------
  // Test 8: updatePaymentFulfillment rejects non-member with 400
  // -------------------------------------------------------------
  test('updatePaymentFulfillment rejects memberId who is not a member of the group with 400', async () => {
    const foreignUserRes = await pool.query(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES ('foreign_payer@example.com', 'dummyhash', 'Foreign Payer', 'member')
      RETURNING id;
    `);
    const foreignUserId = foreignUserRes.rows[0].id;

    const res = await request(app)
      .patch(`/api/groups/${testGroup.id}/cart/allocations/payment`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ memberId: foreignUserId, paid: true });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Target member is not in this group/i);

    await pool.query('DELETE FROM users WHERE id = $1', [foreignUserId]);
  });

  // -------------------------------------------------------------
  // Test 9: getCartData gracefully handles corrupted JSON
  // -------------------------------------------------------------
  test('getCartData safely recovers from corrupted allocation JSON without throwing', async () => {
    const mockPool = {
      query: async () => ({
        rows: [
          {
            id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            productId: testProduct.id,
            quantity: 10,
            allocations: '{corrupt json...',
          },
        ],
      }),
    };

    const parsed = await getCartData(testGroup.id, mockPool);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    expect(parsed[0].quantity).toBe(10);
    expect(parsed[0].allocations).toEqual([]);
  });

  // -------------------------------------------------------------
  // Test 10: Migration preserves group_cart data idempotently
  // -------------------------------------------------------------
  test('group_cart_items and group_cart_allocations data are preserved across migration', async () => {
    const beforeCheck = await pool.query(
      'SELECT id, quantity FROM group_cart_items WHERE group_id = $1',
      [testGroup.id]
    );
    expect(beforeCheck.rows.length).toBeGreaterThan(0);
    const originalItemId = beforeCheck.rows[0].id;

    // Run migration script
    const { execSync } = await import('child_process');
    const stdout = execSync('node db/migrate.js', { cwd: process.cwd() }).toString();
    expect(stdout).toMatch(/Database migration completed successfully/i);

    // Verify test item still exists with unchanged id and quantity
    const afterCheck = await pool.query(
      'SELECT id, quantity FROM group_cart_items WHERE id = $1',
      [originalItemId]
    );
    expect(afterCheck.rows.length).toBe(1);
    expect(afterCheck.rows[0].id).toBe(originalItemId);
  });

  // -------------------------------------------------------------
  // Test 11: End-to-end send permissions: internal chat allows member, group-vendor forbids
  // -------------------------------------------------------------
  test('Member can send messages in internal group chat, but is forbidden in group-vendor chat', async () => {
    // 1. Get internal chat for testGroup
    const internalChatRes = await pool.query(
      `SELECT id FROM conversations WHERE group_id = $1 AND type = 'group' LIMIT 1;`,
      [testGroup.id]
    );
    const internalChatId = internalChatRes.rows[0].id;

    // 2. Member sends to internal chat -> MUST succeed (201)
    const sendInternalRes = await request(app)
      .post(`/api/chat/conversations/${internalChatId}/messages`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ content: 'Hello everyone in our internal purchasing group!' });

    expect(sendInternalRes.status).toBe(201);
    expect(sendInternalRes.body.success).toBe(true);
    expect(sendInternalRes.body.data.content).toBe('Hello everyone in our internal purchasing group!');

    // 3. Get group-vendor chat for testGroup
    const vendorChatRes = await pool.query(
      `SELECT id FROM conversations WHERE group_id = $1 AND type = 'group-vendor' LIMIT 1;`,
      [testGroup.id]
    );
    if (vendorChatRes.rows.length > 0) {
      const vendorChatId = vendorChatRes.rows[0].id;

      // 4. Member sends to group-vendor chat -> MUST fail (403 Forbidden)
      const sendVendorRes = await request(app)
        .post(`/api/chat/conversations/${vendorChatId}/messages`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ content: 'Regular member trying to message vendor directly' });

      expect(sendVendorRes.status).toBe(403);
      expect(sendVendorRes.body.success).toBe(false);
      expect(sendVendorRes.body.error).toMatch(/permission/i);
    }
  });

  // -------------------------------------------------------------
  // Test 12: Integer overflow protection on addToGroupCart and updateCartAllocation
  // -------------------------------------------------------------
  test('Cart quantity updates that would cause 32-bit integer overflow return 400 Bad Request', async () => {
    // 1. Attempting to add quantity that exceeds MAX_PG_INT
    const overflowAddRes = await request(app)
      .post(`/api/groups/${testGroup.id}/cart/items`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ productId: testProduct.id, quantity: 2147483648 });

    expect(overflowAddRes.status).toBe(400);
    expect(overflowAddRes.body.error).toMatch(/within valid range|32-bit integer limit/i);

    // 2. Attempting to update allocation beyond MAX_PG_INT
    const overflowAllocRes = await request(app)
      .patch(`/api/groups/${testGroup.id}/cart/items/${testProduct.id}/allocations/${memberUser.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ quantity: 2147483648 });

    expect(overflowAllocRes.status).toBe(400);
    expect(overflowAllocRes.body.error).toMatch(/non-negative integer|32-bit integer limit/i);
  });

  // -------------------------------------------------------------
  // Test 13: Total cart item quantity reconciles without phantom unallocated units from removed members
  // -------------------------------------------------------------
  test('Total cart item quantity reconciliation ignores orphaned allocations of removed members', async () => {
    // Create a new temporary member in testGroup
    const tempUserRes = await pool.query(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES ('temp_cart_recon@example.com', 'dummyhash', 'Temp Reconcile', 'member')
      RETURNING id, role;
    `);
    const tempUser = tempUserRes.rows[0];
    const tempToken = generateToken(tempUser.id, tempUser.role);

    await pool.query(
      'INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)',
      [testGroup.id, tempUser.id, 'member']
    );

    // Temp member adds 5 units
    await request(app)
      .post(`/api/groups/${testGroup.id}/cart/items`)
      .set('Authorization', `Bearer ${tempToken}`)
      .send({ productId: testProduct.id, quantity: 5 });

    // Now remove temp member from group_members
    await pool.query(
      'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
      [testGroup.id, tempUser.id]
    );

    // Active member updates their allocation to 4 units
    const patchRes = await request(app)
      .patch(`/api/groups/${testGroup.id}/cart/items/${testProduct.id}/allocations/${memberUser.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ quantity: 4 });

    expect(patchRes.status).toBe(200);
    const updatedItem = patchRes.body.data.items.find(i => i.productId === testProduct.id);
    // Quantity should reconcile to active members' allocations (4), not counting the 5 orphaned units
    expect(updatedItem.quantity).toBe(4);

    // Cleanup temp user
    await pool.query('DELETE FROM users WHERE id = $1', [tempUser.id]);
  });

  // -------------------------------------------------------------
  // Test 14: Payment fulfillment markAll only updates allocations of active group members
  // -------------------------------------------------------------
  test('Payment fulfillment markAll does not modify allocations of users who left the group', async () => {
    // Create a removed user with an allocation
    const leftUserRes = await pool.query(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES ('left_cart_payer@example.com', 'dummyhash', 'Left Payer', 'member')
      RETURNING id, role;
    `);
    const leftUser = leftUserRes.rows[0];

    const itemRes = await pool.query(
      'SELECT id FROM group_cart_items WHERE group_id = $1 AND product_id = $2',
      [testGroup.id, testProduct.id]
    );
    const cartItemId = itemRes.rows[0].id;

    // Manually insert an orphaned allocation for the left user with paid = false
    await pool.query(
      `INSERT INTO group_cart_allocations (cart_item_id, user_id, quantity, paid)
       VALUES ($1, $2, 3, false)
       ON CONFLICT (cart_item_id, user_id) DO UPDATE SET paid = false`,
      [cartItemId, leftUser.id]
    );

    // Run markAll paid
    const markRes = await request(app)
      .patch(`/api/groups/${testGroup.id}/cart/allocations/payment`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ markAll: true, paid: true });

    expect(markRes.status).toBe(200);

    // Verify orphaned allocation remains untouched (paid = false)
    const checkLeftAlloc = await pool.query(
      'SELECT paid FROM group_cart_allocations WHERE cart_item_id = $1 AND user_id = $2',
      [cartItemId, leftUser.id]
    );
    expect(checkLeftAlloc.rows[0].paid).toBe(false);

    // Active member's allocation is marked paid
    const checkActiveAlloc = await pool.query(
      'SELECT paid FROM group_cart_allocations WHERE cart_item_id = $1 AND user_id = $2',
      [cartItemId, memberUser.id]
    );
    expect(checkActiveAlloc.rows[0].paid).toBe(true);

    // Cleanup
    await pool.query('DELETE FROM group_cart_allocations WHERE user_id = $1', [leftUser.id]);
    await pool.query('DELETE FROM users WHERE id = $1', [leftUser.id]);
  });
});
