/**
 * Challenger 2: Adversarial Stress Test Suite for Group Cart Persistence & Real-Time Sync
 *
 * Verifies:
 * 1. Comprehensive 403 Authorization Matrix: Non-member rejected across ALL 7 REST cart endpoints.
 * 2. Unauthenticated access rejected with 401.
 * 3. Member impersonation / foreign allocation rejected with 400.
 * 4. Socket.IO Room Security: Non-members cannot join room cart:${groupId}, verified via server adapter.
 * 5. Strict Cross-Group Isolation: Group A mutations never leak to Group B sockets or DB.
 * 6. Multi-client fanout: Multiple distinct sockets concurrently receive broadcast.
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

describe('Challenger 2: Adversarial Cart & Socket Synchronization Test Suite', () => {
  let app;
  let httpServer;
  let io;
  let serverPort;

  // Test entities
  let userA1, userA2, userB1, nonMemberUser;
  let tokenA1, tokenA2, tokenB1, nonMemberToken;
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

  beforeAll(async () => {
    // 1. Create unique test users
    const userRes = await pool.query(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES 
        ('adv_user_a1@test.com', 'hash', 'User A1', 'member'),
        ('adv_user_a2@test.com', 'hash', 'User A2', 'member'),
        ('adv_user_b1@test.com', 'hash', 'User B1', 'member'),
        ('adv_non_member@test.com', 'hash', 'Non Member User', 'member')
      RETURNING id, email, role
    `);

    userA1 = userRes.rows.find(u => u.email === 'adv_user_a1@test.com');
    userA2 = userRes.rows.find(u => u.email === 'adv_user_a2@test.com');
    userB1 = userRes.rows.find(u => u.email === 'adv_user_b1@test.com');
    nonMemberUser = userRes.rows.find(u => u.email === 'adv_non_member@test.com');

    tokenA1 = generateToken(userA1.id, userA1.role);
    tokenA2 = generateToken(userA2.id, userA2.role);
    tokenB1 = generateToken(userB1.id, userB1.role);
    nonMemberToken = generateToken(nonMemberUser.id, nonMemberUser.role);

    // 2. Create isolated test groups
    const groupResA = await pool.query(`
      INSERT INTO groups (name, join_code, moq_target, status, created_by)
      VALUES ('Adv Group Alpha', 'ALPHATEST1', 10, 'active', $1)
      RETURNING id, name
    `, [userA1.id]);
    groupA = groupResA.rows[0];

    const groupResB = await pool.query(`
      INSERT INTO groups (name, join_code, moq_target, status, created_by)
      VALUES ('Adv Group Beta', 'BETATEST1', 10, 'active', $1)
      RETURNING id, name
    `, [userB1.id]);
    groupB = groupResB.rows[0];

    // 3. Add memberships
    // Group Alpha: userA1 (admin), userA2 (member)
    await pool.query(`
      INSERT INTO group_members (group_id, user_id, role)
      VALUES 
        ($1, $2, 'admin'),
        ($1, $3, 'member')
    `, [groupA.id, userA1.id, userA2.id]);

    // Group Beta: userB1 (admin)
    await pool.query(`
      INSERT INTO group_members (group_id, user_id, role)
      VALUES ($1, $2, 'admin')
    `, [groupB.id, userB1.id]);

    // 4. Fetch test products
    const prodRes = await pool.query(`SELECT id, name FROM products LIMIT 2`);
    testProduct1 = prodRes.rows[0];
    testProduct2 = prodRes.rows[1];

    // 5. Initialize Server & Socket.IO
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
    // Close sockets
    for (const s of openSockets) {
      if (s.connected) s.disconnect();
    }

    // Clean up DB records
    if (groupA?.id) {
      await pool.query('DELETE FROM group_cart_items WHERE group_id = $1', [groupA.id]);
      await pool.query('DELETE FROM groups WHERE id = $1', [groupA.id]);
    }
    if (groupB?.id) {
      await pool.query('DELETE FROM group_cart_items WHERE group_id = $1', [groupB.id]);
      await pool.query('DELETE FROM groups WHERE id = $1', [groupB.id]);
    }
    await pool.query(`
      DELETE FROM users WHERE email IN (
        'adv_user_a1@test.com',
        'adv_user_a2@test.com',
        'adv_user_b1@test.com',
        'adv_non_member@test.com'
      )
    `);

    if (io) io.close();
    if (httpServer) await new Promise((resolve) => httpServer.close(resolve));
  });

  beforeEach(async () => {
    // Clean cart items in both groups before each test
    await pool.query('DELETE FROM group_cart_items WHERE group_id IN ($1, $2)', [groupA.id, groupB.id]);
  });

  // =========================================================================
  // 1. Comprehensive 403 Authorization Matrix on ALL 7 Cart Endpoints
  // =========================================================================
  describe('Adversarial 403 & 401 Authorization Enforcement', () => {
    test('Non-member is strictly rejected with 403 across ALL 7 cart REST endpoints', async () => {
      // First, seed an item in Group A via legitimate Member A1
      await request(app)
        .post(`/api/groups/${groupA.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenA1}`)
        .send({ productId: testProduct1.id, quantity: 2 });

      // 1. GET cart
      const getRes = await request(app)
        .get(`/api/groups/${groupA.id}/cart`)
        .set('Authorization', `Bearer ${nonMemberToken}`);
      expect(getRes.status).toBe(403);
      expect(getRes.body.success).toBe(false);

      // 2. POST item
      const postRes = await request(app)
        .post(`/api/groups/${groupA.id}/cart/items`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .send({ productId: testProduct1.id, quantity: 1 });
      expect(postRes.status).toBe(403);
      expect(postRes.body.success).toBe(false);

      // 3. PATCH item quantity
      const patchQtyRes = await request(app)
        .patch(`/api/groups/${groupA.id}/cart/items/${testProduct1.id}`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .send({ quantity: 10 });
      expect(patchQtyRes.status).toBe(403);
      expect(patchQtyRes.body.success).toBe(false);

      // 4. PATCH allocation
      const patchAllocRes = await request(app)
        .patch(`/api/groups/${groupA.id}/cart/items/${testProduct1.id}/allocations/${userA1.id}`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .send({ quantity: 1 });
      expect(patchAllocRes.status).toBe(403);
      expect(patchAllocRes.body.success).toBe(false);

      // 5. PATCH payment
      const patchPayRes = await request(app)
        .patch(`/api/groups/${groupA.id}/cart/allocations/payment`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .send({ markAll: true });
      expect(patchPayRes.status).toBe(403);
      expect(patchPayRes.body.success).toBe(false);

      // 6. DELETE item
      const delItemRes = await request(app)
        .delete(`/api/groups/${groupA.id}/cart/items/${testProduct1.id}`)
        .set('Authorization', `Bearer ${nonMemberToken}`);
      expect(delItemRes.status).toBe(403);
      expect(delItemRes.body.success).toBe(false);

      // 7. DELETE cart (clear)
      const clearRes = await request(app)
        .delete(`/api/groups/${groupA.id}/cart`)
        .set('Authorization', `Bearer ${nonMemberToken}`);
      expect(clearRes.status).toBe(403);
      expect(clearRes.body.success).toBe(false);
    });

    test('Unauthenticated request is rejected with 401', async () => {
      const getRes = await request(app).get(`/api/groups/${groupA.id}/cart`);
      expect(getRes.status).toBe(401);

      const postRes = await request(app)
        .post(`/api/groups/${groupA.id}/cart/items`)
        .send({ productId: testProduct1.id, quantity: 1 });
      expect(postRes.status).toBe(401);
    });

    test('Group member cannot add item allocating to a non-member (400 Bad Request)', async () => {
      const res = await request(app)
        .post(`/api/groups/${groupA.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenA1}`)
        .send({
          productId: testProduct1.id,
          quantity: 2,
          memberId: nonMemberUser.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/not in this group/i);
    });

    test('Group member cannot update allocation targeting a non-member (400 Bad Request)', async () => {
      // Seed item first
      await request(app)
        .post(`/api/groups/${groupA.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenA1}`)
        .send({ productId: testProduct1.id, quantity: 2 });

      const res = await request(app)
        .patch(`/api/groups/${groupA.id}/cart/items/${testProduct1.id}/allocations/${nonMemberUser.id}`)
        .set('Authorization', `Bearer ${tokenA1}`)
        .send({ quantity: 3 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/not in this group/i);
    });
  });

  // =========================================================================
  // 2. Socket.IO Room Security & Membership Validation
  // =========================================================================
  describe('Adversarial Socket.IO Room Security', () => {
    test('Non-group-member CANNOT join cart room cart:${groupId} and socket is NOT added to room', async () => {
      const socket = await createSocket(nonMemberToken);

      const errorPromise = new Promise((resolve) => {
        socket.on('error', resolve);
      });

      let joinedFired = false;
      socket.on('joined-cart', () => {
        joinedFired = true;
      });

      socket.emit('join-cart', { groupId: groupA.id });

      const errorPayload = await errorPromise;
      expect(errorPayload.message).toMatch(/Access denied: not a member of this group/i);
      expect(errorPayload.groupId).toBe(groupA.id);
      expect(joinedFired).toBe(false);

      // Verify server-side socket room membership
      const room = io.sockets.adapter.rooms.get(`cart:${groupA.id}`);
      if (room) {
        expect(room.has(socket.id)).toBe(false);
      }
    });

    test('Non-member socket receives NO cart broadcast events when members update the cart', async () => {
      const nonMemberSock = await createSocket(nonMemberToken);
      const memberSock = await createSocket(tokenA1);

      // Member joins room
      await new Promise((resolve) => {
        memberSock.emit('join-cart', { groupId: groupA.id });
        memberSock.once('joined-cart', resolve);
      });

      // Attempt join by non-member (will fail)
      await new Promise((resolve) => {
        nonMemberSock.emit('join-cart', { groupId: groupA.id });
        nonMemberSock.once('error', resolve);
      });

      let nonMemberReceivedCount = 0;
      nonMemberSock.on('cart-updated', () => {
        nonMemberReceivedCount++;
      });
      nonMemberSock.on('cart-cleared', () => {
        nonMemberReceivedCount++;
      });

      const memberUpdatePromise = new Promise((resolve) => {
        memberSock.on('cart-updated', resolve);
      });

      // Member A1 adds item
      await request(app)
        .post(`/api/groups/${groupA.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenA1}`)
        .send({ productId: testProduct1.id, quantity: 3 });

      await memberUpdatePromise;

      // Wait 150ms to ensure non-member socket did not receive any event
      await new Promise((r) => setTimeout(r, 150));
      expect(nonMemberReceivedCount).toBe(0);
    });

    test('Unauthenticated socket connection is rejected by cart socket middleware', async () => {
      await expect(
        new Promise((resolve, reject) => {
          const badSocket = ClientIO(`http://localhost:${serverPort}`, {
            auth: { token: 'invalid.jwt.token' },
            transports: ['websocket'],
            reconnection: false,
          });
          openSockets.push(badSocket);
          badSocket.on('connect', () => resolve('connected'));
          badSocket.on('connect_error', reject);
        })
      ).rejects.toThrow(/Authentication error/i);
    });
  });

  // =========================================================================
  // 3. Multi-Tenant Group Cart Isolation (Group A vs Group B)
  // =========================================================================
  describe('Cross-Group Isolation Verification', () => {
    test('Updating Group A NEVER triggers updates or leaks data to Group B sockets or DB', async () => {
      const socketA = await createSocket(tokenA1);
      const socketB = await createSocket(tokenB1);

      // Socket A joins Group A cart
      await new Promise((resolve) => {
        socketA.emit('join-cart', { groupId: groupA.id });
        socketA.once('joined-cart', resolve);
      });

      // Socket B joins Group B cart
      await new Promise((resolve) => {
        socketB.emit('join-cart', { groupId: groupB.id });
        socketB.once('joined-cart', resolve);
      });

      let eventsB = [];
      socketB.on('cart-updated', (data) => eventsB.push(data));
      socketB.on('cart-cleared', (data) => eventsB.push(data));

      let eventsA = [];
      socketA.on('cart-updated', (data) => eventsA.push(data));
      socketA.on('cart-cleared', (data) => eventsA.push(data));

      // 1. User A1 adds item to Group A
      const postA = await request(app)
        .post(`/api/groups/${groupA.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenA1}`)
        .send({ productId: testProduct1.id, quantity: 5 });
      expect(postA.status).toBe(201);

      // Wait 150ms
      await new Promise((r) => setTimeout(r, 150));

      expect(eventsA).toHaveLength(1);
      expect(eventsA[0].groupId).toBe(groupA.id);
      expect(eventsA[0].items[0].productId).toBe(testProduct1.id);

      // Group B must receive NOTHING
      expect(eventsB).toHaveLength(0);

      // Group B database cart must be empty
      const getCartB = await request(app)
        .get(`/api/groups/${groupB.id}/cart`)
        .set('Authorization', `Bearer ${tokenB1}`);
      expect(getCartB.body.data.items).toHaveLength(0);

      // 2. User B1 adds item to Group B
      const postB = await request(app)
        .post(`/api/groups/${groupB.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenB1}`)
        .send({ productId: testProduct2.id, quantity: 7 });
      expect(postB.status).toBe(201);

      await new Promise((r) => setTimeout(r, 150));

      expect(eventsB).toHaveLength(1);
      expect(eventsB[0].groupId).toBe(groupB.id);
      expect(eventsB[0].items[0].productId).toBe(testProduct2.id);

      // Group A must NOT receive any event from Group B mutation
      expect(eventsA).toHaveLength(1); // still only the first event

      // 3. User A1 clears Group A
      await request(app)
        .delete(`/api/groups/${groupA.id}/cart`)
        .set('Authorization', `Bearer ${tokenA1}`);

      await new Promise((r) => setTimeout(r, 150));

      expect(eventsA).toHaveLength(2);
      expect(eventsA[1].groupId).toBe(groupA.id);

      // Group B still receives NO event and cart B remains intact with 1 item
      expect(eventsB).toHaveLength(1);

      const checkCartB = await request(app)
        .get(`/api/groups/${groupB.id}/cart`)
        .set('Authorization', `Bearer ${tokenB1}`);
      expect(checkCartB.body.data.items).toHaveLength(1);
      expect(checkCartB.body.data.items[0].quantity).toBe(7);
    });

    test('Cross-group mutation attempts are rejected with 403', async () => {
      // User A1 attempts to mutate Group B's cart
      const res1 = await request(app)
        .post(`/api/groups/${groupB.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenA1}`)
        .send({ productId: testProduct1.id, quantity: 1 });
      expect(res1.status).toBe(403);

      const res2 = await request(app)
        .delete(`/api/groups/${groupB.id}/cart`)
        .set('Authorization', `Bearer ${tokenA1}`);
      expect(res2.status).toBe(403);

      // User B1 attempts to mutate Group A's cart
      const res3 = await request(app)
        .delete(`/api/groups/${groupA.id}/cart`)
        .set('Authorization', `Bearer ${tokenB1}`);
      expect(res3.status).toBe(403);
    });
  });

  // =========================================================================
  // 4. Multi-Socket Fanout & Real-Time Sync Verification
  // =========================================================================
  describe('Multi-Socket Synchronization & Fanout', () => {
    test('Simultaneous delivery: All group members connected via separate sockets receive cart-updated immediately', async () => {
      const socketA1 = await createSocket(tokenA1);
      const socketA2 = await createSocket(tokenA2);

      // Both join Group A cart room
      await Promise.all([
        new Promise((resolve) => {
          socketA1.emit('join-cart', { groupId: groupA.id });
          socketA1.once('joined-cart', resolve);
        }),
        new Promise((resolve) => {
          socketA2.emit('join-cart', { groupId: groupA.id });
          socketA2.once('joined-cart', resolve);
        }),
      ]);

      const promiseA1 = new Promise((resolve) => socketA1.once('cart-updated', resolve));
      const promiseA2 = new Promise((resolve) => socketA2.once('cart-updated', resolve));

      // User A1 adds item
      await request(app)
        .post(`/api/groups/${groupA.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenA1}`)
        .send({ productId: testProduct1.id, quantity: 4 });

      const [eventA1, eventA2] = await Promise.all([promiseA1, promiseA2]);

      expect(eventA1.groupId).toBe(groupA.id);
      expect(eventA1.items).toHaveLength(1);
      expect(eventA1.items[0].quantity).toBe(4);

      expect(eventA2.groupId).toBe(groupA.id);
      expect(eventA2.items).toHaveLength(1);
      expect(eventA2.items[0].quantity).toBe(4);
    });
  });
});
