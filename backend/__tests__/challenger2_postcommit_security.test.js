/**
 * Challenger 2: Empirical Verification of Post-Commit Broadcast Guarantees and 403 Access Control
 *
 * Test Mandates:
 * 1. Post-Commit Guarantee: Socket.IO broadcasts occur strictly AFTER database COMMIT.
 *    - Aborted / rolled back transactions MUST NOT emit any Socket.IO events.
 *    - Native PostgreSQL trigger-injected failures before COMMIT trigger ROLLBACK and suppress broadcasts.
 *    - Client socket receiving cart-updated can immediately read committed database state.
 * 2. 403 Access Control Preservation across ALL 7 Cart Endpoints:
 *    - GET /api/groups/:groupId/cart
 *    - POST /api/groups/:groupId/cart/items
 *    - PATCH /api/groups/:groupId/cart/items/:productId
 *    - PATCH /api/groups/:groupId/cart/items/:productId/allocations/:memberId
 *    - PATCH /api/groups/:groupId/cart/allocations/payment
 *    - DELETE /api/groups/:groupId/cart/items/:productId
 *    - DELETE /api/groups/:groupId/cart
 *    - Verified for: Unenrolled Strangers, Revoked Former Members, and Cross-Group Tenants.
 *    - Socket.IO join-cart rejected for non-members with access denied.
 * 3. Unauthenticated requests strictly return 401.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ClientIO } from 'socket.io-client';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import pool from '../config/database.js';
import cartRoutes from '../routes/cart.routes.js';
import { initializeCartSocket } from '../socket/cart.socket.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'save-together-development-jwt-secret-key-12345';

function generateToken(userId, role = 'member') {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '1h' });
}

describe('Challenger 2: Post-Commit Broadcasts & 403 Security Matrix', () => {
  let app;
  let httpServer;
  let io;
  let serverPort;

  let memberA1, memberA2, strangerUser, formerMemberUser, memberB1;
  let tokenA1, tokenA2, tokenStranger, tokenFormerMember, tokenB1;
  let groupA, groupB;
  let testProduct1, testProduct2;

  let openSockets = [];

  function createSocket(token) {
    return new Promise((resolve, reject) => {
      const socket = ClientIO(`http://localhost:${serverPort}`, {
        auth: { token },
        transports: ['websocket'],
        reconnection: false,
      });
      openSockets.push(socket);
      socket.on('connect', () => resolve(socket));
      socket.on('connect_error', reject);
    });
  }

  async function cleanupTestData() {
    await pool.query(`
      DROP TRIGGER IF EXISTS ch2_test_fail_trigger ON group_cart_allocations;
      DROP FUNCTION IF EXISTS ch2_fail_alloc_trigger();

      DELETE FROM group_cart_items WHERE group_id IN (
        SELECT id FROM groups WHERE join_code IN ('CH2ALPHASEC', 'CH2BETASEC')
      );
      DELETE FROM group_members WHERE group_id IN (
        SELECT id FROM groups WHERE join_code IN ('CH2ALPHASEC', 'CH2BETASEC')
      );
      DELETE FROM groups WHERE join_code IN ('CH2ALPHASEC', 'CH2BETASEC');
      DELETE FROM users WHERE email IN (
        'ch2_sec_a1@test.com',
        'ch2_sec_a2@test.com',
        'ch2_sec_stranger@test.com',
        'ch2_sec_former@test.com',
        'ch2_sec_b1@test.com'
      );
    `);
  }

  beforeAll(async () => {
    // 0. Ensure clean initial state
    await cleanupTestData();

    // 1. Create unique test users
    const userRes = await pool.query(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES 
        ('ch2_sec_a1@test.com', 'hash', 'CH2 Member A1', 'member'),
        ('ch2_sec_a2@test.com', 'hash', 'CH2 Member A2', 'member'),
        ('ch2_sec_stranger@test.com', 'hash', 'CH2 Stranger', 'member'),
        ('ch2_sec_former@test.com', 'hash', 'CH2 Former Member', 'member'),
        ('ch2_sec_b1@test.com', 'hash', 'CH2 Member B1', 'member')
      RETURNING id, email, role
    `);

    memberA1 = userRes.rows.find(u => u.email === 'ch2_sec_a1@test.com');
    memberA2 = userRes.rows.find(u => u.email === 'ch2_sec_a2@test.com');
    strangerUser = userRes.rows.find(u => u.email === 'ch2_sec_stranger@test.com');
    formerMemberUser = userRes.rows.find(u => u.email === 'ch2_sec_former@test.com');
    memberB1 = userRes.rows.find(u => u.email === 'ch2_sec_b1@test.com');

    tokenA1 = generateToken(memberA1.id, memberA1.role);
    tokenA2 = generateToken(memberA2.id, memberA2.role);
    tokenStranger = generateToken(strangerUser.id, strangerUser.role);
    tokenFormerMember = generateToken(formerMemberUser.id, formerMemberUser.role);
    tokenB1 = generateToken(memberB1.id, memberB1.role);

    // 2. Create isolated test groups
    const groupResA = await pool.query(`
      INSERT INTO groups (name, join_code, moq_target, status, created_by)
      VALUES ('CH2 Group Alpha', 'CH2ALPHASEC', 10, 'active', $1)
      RETURNING id, name
    `, [memberA1.id]);
    groupA = groupResA.rows[0];

    const groupResB = await pool.query(`
      INSERT INTO groups (name, join_code, moq_target, status, created_by)
      VALUES ('CH2 Group Beta', 'CH2BETASEC', 10, 'active', $1)
      RETURNING id, name
    `, [memberB1.id]);
    groupB = groupResB.rows[0];

    // 3. Memberships
    // Group Alpha: memberA1 (admin), memberA2 (member)
    await pool.query(`
      INSERT INTO group_members (group_id, user_id, role)
      VALUES 
        ($1, $2, 'admin'),
        ($1, $3, 'member')
    `, [groupA.id, memberA1.id, memberA2.id]);

    // Group Beta: memberB1 (admin)
    await pool.query(`
      INSERT INTO group_members (group_id, user_id, role)
      VALUES ($1, $2, 'admin')
    `, [groupB.id, memberB1.id]);

    // 4. Products
    const prodRes = await pool.query(`SELECT id, name FROM products LIMIT 2`);
    testProduct1 = prodRes.rows[0];
    testProduct2 = prodRes.rows[1];

    // 5. Setup PostgreSQL failure injection trigger for empirical rollback testing
    // Triggers exception when quantity = 777777 during group_cart_allocations insert
    await pool.query(`
      CREATE OR REPLACE FUNCTION ch2_fail_alloc_trigger() RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.quantity = 777777 THEN
          RAISE EXCEPTION 'TRIGGER_SIMULATED_FAILURE_BEFORE_COMMIT';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS ch2_test_fail_trigger ON group_cart_allocations;
      CREATE TRIGGER ch2_test_fail_trigger
      BEFORE INSERT OR UPDATE ON group_cart_allocations
      FOR EACH ROW EXECUTE FUNCTION ch2_fail_alloc_trigger();
    `);

    // 6. Setup Express app & Socket.IO
    app = express();
    app.use(express.json());
    httpServer = http.createServer(app);

    io = new Server(httpServer, {
      cors: { origin: '*' },
    });
    app.set('io', io);

    app.use('/api/groups/:groupId/cart', cartRoutes);
    initializeCartSocket(io);

    await new Promise((resolve) => {
      httpServer.listen(0, () => {
        serverPort = httpServer.address().port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    for (const s of openSockets) {
      if (s.connected) s.disconnect();
    }

    await cleanupTestData();

    if (io) io.close();
    if (httpServer) await new Promise((resolve) => httpServer.close(resolve));
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM group_cart_items WHERE group_id IN ($1, $2)', [groupA.id, groupB.id]);
  });

  // =========================================================================
  // Section 1: Post-Commit Broadcast Guarantees (Empirical Proof)
  // =========================================================================
  describe('Post-Commit Broadcast Guarantees', () => {
    test('Transaction rollback suppresses Socket.IO broadcast completely (zero leakage on error)', async () => {
      // Connect member socket listening for cart updates in groupA
      const memberSock = await createSocket(tokenA2);
      await new Promise((resolve) => {
        memberSock.emit('join-cart', { groupId: groupA.id });
        memberSock.once('joined-cart', resolve);
      });

      let broadcastEvents = [];
      memberSock.on('cart-updated', (data) => broadcastEvents.push(data));
      memberSock.on('cart-cleared', (data) => broadcastEvents.push(data));

      // Attempt to add item with trigger-failing quantity 777777
      // In addToGroupCart:
      // 1. group_cart_items insert executes with quantity 777777
      // 2. group_cart_allocations insert executes with quantity 777777 -> trigger raises EXCEPTION
      // 3. Controller catches error, calls ROLLBACK, releases client, returns 500
      // 4. broadcastCartUpdated is NEVER executed
      const res = await request(app)
        .post(`/api/groups/${groupA.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenA1}`)
        .send({ productId: testProduct1.id, quantity: 777777 });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);

      // Wait 150ms to ensure no asynchronous or premature broadcast arrived
      await new Promise((r) => setTimeout(r, 150));

      // Assert ZERO broadcasts were emitted to connected clients
      expect(broadcastEvents).toHaveLength(0);

      // Assert transaction rolled back cleanly in PostgreSQL: no item was left behind
      const dbCheck = await pool.query(
        'SELECT * FROM group_cart_items WHERE group_id = $1 AND product_id = $2',
        [groupA.id, testProduct1.id]
      );
      expect(dbCheck.rows).toHaveLength(0);
    });

    test('Successful commit strictly broadcasts committed DB state and recipient reads it with 100% consistency', async () => {
      const memberSock = await createSocket(tokenA2);
      await new Promise((resolve) => {
        memberSock.emit('join-cart', { groupId: groupA.id });
        memberSock.once('joined-cart', resolve);
      });

      const receivePromise = new Promise((resolve) => {
        memberSock.once('cart-updated', async (data) => {
          // Concurrently query database to verify immediate post-commit consistency
          const check = await pool.query(
            'SELECT quantity FROM group_cart_items WHERE group_id = $1 AND product_id = $2',
            [groupA.id, testProduct1.id]
          );
          resolve({
            receivedData: data,
            dbQuantity: check.rows[0]?.quantity,
          });
        });
      });

      const res = await request(app)
        .post(`/api/groups/${groupA.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenA1}`)
        .send({ productId: testProduct1.id, quantity: 4 });

      expect(res.status).toBe(201);

      const { receivedData, dbQuantity } = await receivePromise;

      // Verify database reflects committed data and matches socket payload exactly
      expect(dbQuantity).toBe(4);
      expect(receivedData.items).toHaveLength(1);
      expect(receivedData.items[0].quantity).toBe(4);
      expect(receivedData.items[0].allocations).toHaveLength(1);
      expect(receivedData.items[0].allocations[0].quantity).toBe(4);
    });
  });

  // =========================================================================
  // Section 2: Complete 403 Access Control Matrix Across ALL 7 Cart Endpoints
  // =========================================================================
  describe('Comprehensive 403 Access Control Matrix', () => {
    test('Unenrolled Stranger is rejected with 403 across ALL 7 cart endpoints', async () => {
      // Seed an item in groupA via legitimate memberA1
      await request(app)
        .post(`/api/groups/${groupA.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenA1}`)
        .send({ productId: testProduct1.id, quantity: 2 });

      // 1. GET /api/groups/:groupId/cart
      const res1 = await request(app)
        .get(`/api/groups/${groupA.id}/cart`)
        .set('Authorization', `Bearer ${tokenStranger}`);
      expect(res1.status).toBe(403);
      expect(res1.body.success).toBe(false);
      expect(res1.body.error).toMatch(/Access denied/i);

      // 2. POST /api/groups/:groupId/cart/items
      const res2 = await request(app)
        .post(`/api/groups/${groupA.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenStranger}`)
        .send({ productId: testProduct2.id, quantity: 1 });
      expect(res2.status).toBe(403);
      expect(res2.body.success).toBe(false);
      expect(res2.body.error).toMatch(/Access denied/i);

      // 3. PATCH /api/groups/:groupId/cart/items/:productId
      const res3 = await request(app)
        .patch(`/api/groups/${groupA.id}/cart/items/${testProduct1.id}`)
        .set('Authorization', `Bearer ${tokenStranger}`)
        .send({ quantity: 10 });
      expect(res3.status).toBe(403);
      expect(res3.body.success).toBe(false);
      expect(res3.body.error).toMatch(/Access denied/i);

      // 4. PATCH /api/groups/:groupId/cart/items/:productId/allocations/:memberId
      const res4 = await request(app)
        .patch(`/api/groups/${groupA.id}/cart/items/${testProduct1.id}/allocations/${memberA1.id}`)
        .set('Authorization', `Bearer ${tokenStranger}`)
        .send({ quantity: 5 });
      expect(res4.status).toBe(403);
      expect(res4.body.success).toBe(false);
      expect(res4.body.error).toMatch(/Access denied/i);

      // 5. PATCH /api/groups/:groupId/cart/allocations/payment
      const res5 = await request(app)
        .patch(`/api/groups/${groupA.id}/cart/allocations/payment`)
        .set('Authorization', `Bearer ${tokenStranger}`)
        .send({ markAll: true });
      expect(res5.status).toBe(403);
      expect(res5.body.success).toBe(false);
      expect(res5.body.error).toMatch(/Access denied/i);

      // 6. DELETE /api/groups/:groupId/cart/items/:productId
      const res6 = await request(app)
        .delete(`/api/groups/${groupA.id}/cart/items/${testProduct1.id}`)
        .set('Authorization', `Bearer ${tokenStranger}`);
      expect(res6.status).toBe(403);
      expect(res6.body.success).toBe(false);
      expect(res6.body.error).toMatch(/Access denied/i);

      // 7. DELETE /api/groups/:groupId/cart
      const res7 = await request(app)
        .delete(`/api/groups/${groupA.id}/cart`)
        .set('Authorization', `Bearer ${tokenStranger}`);
      expect(res7.status).toBe(403);
      expect(res7.body.success).toBe(false);
      expect(res7.body.error).toMatch(/Access denied/i);
    });

    test('Revoked / Former Member is immediately rejected with 403 across ALL 7 cart endpoints', async () => {
      // Step A: temporarily add formerMemberUser to groupA
      await pool.query(
        `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member')`,
        [groupA.id, formerMemberUser.id]
      );

      // Verify formerMember CAN access cart while enrolled
      const accessBefore = await request(app)
        .get(`/api/groups/${groupA.id}/cart`)
        .set('Authorization', `Bearer ${tokenFormerMember}`);
      expect(accessBefore.status).toBe(200);

      // Seed item
      await request(app)
        .post(`/api/groups/${groupA.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenFormerMember}`)
        .send({ productId: testProduct1.id, quantity: 2 });

      // Step B: REVOKE membership
      await pool.query(
        `DELETE FROM group_members WHERE group_id = $1 AND user_id = $2`,
        [groupA.id, formerMemberUser.id]
      );

      // Step C: Verify all 7 endpoints now reject revoked member with 403
      // 1. GET cart
      const getRes = await request(app)
        .get(`/api/groups/${groupA.id}/cart`)
        .set('Authorization', `Bearer ${tokenFormerMember}`);
      expect(getRes.status).toBe(403);
      expect(getRes.body.error).toMatch(/Access denied/i);

      // 2. POST item
      const postRes = await request(app)
        .post(`/api/groups/${groupA.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenFormerMember}`)
        .send({ productId: testProduct1.id, quantity: 1 });
      expect(postRes.status).toBe(403);
      expect(postRes.body.error).toMatch(/Access denied/i);

      // 3. PATCH quantity
      const patchQty = await request(app)
        .patch(`/api/groups/${groupA.id}/cart/items/${testProduct1.id}`)
        .set('Authorization', `Bearer ${tokenFormerMember}`)
        .send({ quantity: 5 });
      expect(patchQty.status).toBe(403);
      expect(patchQty.body.error).toMatch(/Access denied/i);

      // 4. PATCH allocation
      const patchAlloc = await request(app)
        .patch(`/api/groups/${groupA.id}/cart/items/${testProduct1.id}/allocations/${formerMemberUser.id}`)
        .set('Authorization', `Bearer ${tokenFormerMember}`)
        .send({ quantity: 1 });
      expect(patchAlloc.status).toBe(403);
      expect(patchAlloc.body.error).toMatch(/Access denied/i);

      // 5. PATCH payment
      const patchPay = await request(app)
        .patch(`/api/groups/${groupA.id}/cart/allocations/payment`)
        .set('Authorization', `Bearer ${tokenFormerMember}`)
        .send({ markAll: true });
      expect(patchPay.status).toBe(403);
      expect(patchPay.body.error).toMatch(/Access denied/i);

      // 6. DELETE item
      const delItem = await request(app)
        .delete(`/api/groups/${groupA.id}/cart/items/${testProduct1.id}`)
        .set('Authorization', `Bearer ${tokenFormerMember}`);
      expect(delItem.status).toBe(403);
      expect(delItem.body.error).toMatch(/Access denied/i);

      // 7. DELETE cart
      const clearCart = await request(app)
        .delete(`/api/groups/${groupA.id}/cart`)
        .set('Authorization', `Bearer ${tokenFormerMember}`);
      expect(clearCart.status).toBe(403);
      expect(clearCart.body.error).toMatch(/Access denied/i);
    });

    test('Cross-Tenant Group Member (Group B user calling Group A endpoints) is rejected with 403', async () => {
      // User B1 is legitimate member of Group B, but NOT Group A
      const resGet = await request(app)
        .get(`/api/groups/${groupA.id}/cart`)
        .set('Authorization', `Bearer ${tokenB1}`);
      expect(resGet.status).toBe(403);
      expect(resGet.body.error).toMatch(/Access denied/i);

      const resPost = await request(app)
        .post(`/api/groups/${groupA.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenB1}`)
        .send({ productId: testProduct1.id, quantity: 1 });
      expect(resPost.status).toBe(403);
      expect(resPost.body.error).toMatch(/Access denied/i);

      const resClear = await request(app)
        .delete(`/api/groups/${groupA.id}/cart`)
        .set('Authorization', `Bearer ${tokenB1}`);
      expect(resClear.status).toBe(403);
      expect(resClear.body.error).toMatch(/Access denied/i);
    });

    test('Non-member Socket.IO join-cart is rejected and excluded from room adapter', async () => {
      const strangerSocket = await createSocket(tokenStranger);

      const errPromise = new Promise((resolve) => {
        strangerSocket.once('error', resolve);
      });

      strangerSocket.emit('join-cart', { groupId: groupA.id });
      const err = await errPromise;

      expect(err.message).toMatch(/Access denied: not a member of this group/i);

      // Check socket room membership in Socket.IO adapter
      const room = io.sockets.adapter.rooms.get(`cart:${groupA.id}`);
      if (room) {
        expect(room.has(strangerSocket.id)).toBe(false);
      }
    });

    test('Unauthenticated HTTP requests strictly return 401 Unauthorized', async () => {
      // No token provided
      const noTokenRes = await request(app).get(`/api/groups/${groupA.id}/cart`);
      expect(noTokenRes.status).toBe(401);

      // Invalid token provided
      const badTokenRes = await request(app)
        .get(`/api/groups/${groupA.id}/cart`)
        .set('Authorization', 'Bearer totally-invalid-jwt-token');
      expect(badTokenRes.status).toBe(401);
    });
  });
});
