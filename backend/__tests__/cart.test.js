/**
 * Group Cart Persistence & Real-Time Synchronization Integration Tests
 *
 * Verifies:
 * 1. Member A (Afam) adds item to cart via REST -> Member B (Chioma) fetches cart and sees item and allocation.
 * 2. Real-time Socket.IO synchronization: Afam adds item -> Chioma connected to cart:${groupId} receives cart-updated event.
 * 3. Allocation updates and payment status updates.
 * 4. Non-member access rejection (HTTP 403 & Socket error).
 * 5. Cart item deletion and clear cart with cart-cleared socket broadcast.
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

describe('Group Cart Persistence & Real-Time Synchronization', () => {
  let app;
  let httpServer;
  let io;
  let serverPort;

  let afamUser;
  let chiomaUser;
  let nonMemberUser;
  let testGroup;
  let testProduct;

  let afamToken;
  let chiomaToken;
  let nonMemberToken;

  let afamSocket;
  let chiomaSocket;
  let nonMemberSocket;

  beforeAll(async () => {
    // 1. Fetch seed users
    const usersRes = await pool.query(
      `SELECT id, email, name, role FROM users WHERE email IN ('afam@example.com', 'chioma@example.com')`
    );
    afamUser = usersRes.rows.find(u => u.email === 'afam@example.com');
    chiomaUser = usersRes.rows.find(u => u.email === 'chioma@example.com');

    // Create or fetch a non-member user
    let nonMemberRes = await pool.query(
      `SELECT id, email, name, role FROM users WHERE email = 'nonmember@example.com'`
    );
    if (nonMemberRes.rows.length === 0) {
      const createRes = await pool.query(
        `INSERT INTO users (email, password_hash, name, role)
         VALUES ('nonmember@example.com', 'hashedpw', 'Non Member', 'member')
         RETURNING id, email, name, role`
      );
      nonMemberUser = createRes.rows[0];
    } else {
      nonMemberUser = nonMemberRes.rows[0];
    }

    // 2. Fetch a common group where both Afam and Chioma are members
    const groupRes = await pool.query(
      `SELECT g.id, g.name 
       FROM groups g 
       JOIN group_members gm1 ON g.id = gm1.group_id AND gm1.user_id = $1
       JOIN group_members gm2 ON g.id = gm2.group_id AND gm2.user_id = $2
       LIMIT 1`,
      [afamUser.id, chiomaUser.id]
    );
    testGroup = groupRes.rows[0];

    // Ensure non-member is NOT in this group
    await pool.query(
      `DELETE FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [testGroup.id, nonMemberUser.id]
    );

    // 3. Fetch a product
    const productRes = await pool.query(`SELECT id, name, bulk_price, moq FROM products LIMIT 1`);
    testProduct = productRes.rows[0];

    // 4. Generate JWT tokens
    afamToken = generateToken(afamUser.id, afamUser.role);
    chiomaToken = generateToken(chiomaUser.id, chiomaUser.role);
    nonMemberToken = generateToken(nonMemberUser.id, nonMemberUser.role);

    // 5. Setup Express app & HTTP/Socket.IO server
    app = express();
    app.use(express.json());
    httpServer = http.createServer(app);

    io = new Server(httpServer, {
      cors: { origin: '*' },
    });
    app.set('io', io);

    // Mount cart routes
    app.use('/api/groups/:groupId/cart', cartRoutes);

    // Initialize cart socket handlers
    initializeCartSocket(io);

    // Listen on dynamic port
    await new Promise((resolve) => {
      httpServer.listen(0, () => {
        serverPort = httpServer.address().port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (afamSocket?.connected) afamSocket.disconnect();
    if (chiomaSocket?.connected) chiomaSocket.disconnect();
    if (nonMemberSocket?.connected) nonMemberSocket.disconnect();

    // Clean up test cart items
    if (testGroup?.id) {
      await pool.query('DELETE FROM group_cart_items WHERE group_id = $1', [testGroup.id]);
    }

    if (io) io.close();
    if (httpServer) await new Promise((resolve) => httpServer.close(resolve));
  });

  beforeEach(async () => {
    // Reset cart items for clean test run
    if (testGroup?.id) {
      await pool.query('DELETE FROM group_cart_items WHERE group_id = $1', [testGroup.id]);
    }
  });

  function connectSocket(token) {
    return new Promise((resolve, reject) => {
      const socket = ClientIO(`http://localhost:${serverPort}`, {
        auth: { token },
        transports: ['websocket'],
      });
      socket.on('connect', () => resolve(socket));
      socket.on('connect_error', reject);
    });
  }

  // -------------------------------------------------------------
  // Test 1: Persistence Across Members (REST)
  // -------------------------------------------------------------
  test('Member A (Afam) adds item to cart via REST -> Member B (Chioma) fetches cart and sees item and allocation', async () => {
    // Afam adds 4 units of testProduct to group cart
    const addRes = await request(app)
      .post(`/api/groups/${testGroup.id}/cart/items`)
      .set('Authorization', `Bearer ${afamToken}`)
      .send({
        productId: testProduct.id,
        quantity: 4,
      });

    expect(addRes.status).toBe(201);
    expect(addRes.body.success).toBe(true);
    expect(addRes.body.data.groupId).toBe(testGroup.id);
    expect(addRes.body.data.items).toHaveLength(1);

    const addedItem = addRes.body.data.items[0];
    expect(addedItem.productId).toBe(testProduct.id);
    expect(addedItem.quantity).toBe(4);
    expect(addedItem.allocations).toHaveLength(1);
    expect(addedItem.allocations[0].memberId).toBe(afamUser.id);
    expect(addedItem.allocations[0].quantity).toBe(4);
    expect(addedItem.allocations[0].paid).toBe(false);

    // Chioma (Member B) fetches the group cart
    const getRes = await request(app)
      .get(`/api/groups/${testGroup.id}/cart`)
      .set('Authorization', `Bearer ${chiomaToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data.groupId).toBe(testGroup.id);
    expect(getRes.body.data.items).toHaveLength(1);

    const chiomaSeenItem = getRes.body.data.items[0];
    expect(chiomaSeenItem.productId).toBe(testProduct.id);
    expect(chiomaSeenItem.quantity).toBe(4);
    expect(chiomaSeenItem.allocations[0].memberId).toBe(afamUser.id);
    expect(chiomaSeenItem.allocations[0].quantity).toBe(4);
    expect(chiomaSeenItem.allocations[0].paid).toBe(false);
  });

  // -------------------------------------------------------------
  // Test 2: Real-Time Socket.IO Synchronization
  // -------------------------------------------------------------
  test('Real-time Socket.IO synchronization: Afam adds item -> Chioma in cart room receives cart-updated event', async () => {
    chiomaSocket = await connectSocket(chiomaToken);
    afamSocket = await connectSocket(afamToken);

    // Chioma joins cart room
    await new Promise((resolve) => {
      chiomaSocket.emit('join-cart', { groupId: testGroup.id });
      chiomaSocket.on('joined-cart', (data) => {
        expect(data.groupId).toBe(testGroup.id);
        resolve();
      });
    });

    // Set up promise waiting for cart-updated event on Chioma's socket
    const updatePromise = new Promise((resolve) => {
      chiomaSocket.on('cart-updated', (payload) => {
        resolve(payload);
      });
    });

    // Afam adds item via REST
    const postRes = await request(app)
      .post(`/api/groups/${testGroup.id}/cart/items`)
      .set('Authorization', `Bearer ${afamToken}`)
      .send({
        productId: testProduct.id,
        quantity: 5,
      });

    expect(postRes.status).toBe(201);

    // Chioma receives real-time broadcast without manual refresh
    const eventPayload = await updatePromise;
    expect(eventPayload.groupId).toBe(testGroup.id);
    expect(eventPayload.updatedBy).toBe(afamUser.id);
    expect(eventPayload.items).toHaveLength(1);
    expect(eventPayload.items[0].productId).toBe(testProduct.id);
    expect(eventPayload.items[0].quantity).toBe(5);
  });

  // -------------------------------------------------------------
  // Test 3: Allocation and Payment Status Updates
  // -------------------------------------------------------------
  test('Allocation updates: Chioma contributes quantity and updates paid status', async () => {
    // Afam adds initial 3 units
    await request(app)
      .post(`/api/groups/${testGroup.id}/cart/items`)
      .set('Authorization', `Bearer ${afamToken}`)
      .send({
        productId: testProduct.id,
        quantity: 3,
      });

    // Chioma adds allocation of 2 units with paid: true
    const allocRes = await request(app)
      .patch(`/api/groups/${testGroup.id}/cart/items/${testProduct.id}/allocations/${chiomaUser.id}`)
      .set('Authorization', `Bearer ${chiomaToken}`)
      .send({
        quantity: 2,
        paid: true,
      });

    expect(allocRes.status).toBe(200);
    expect(allocRes.body.success).toBe(true);

    const items = allocRes.body.data.items;
    expect(items).toHaveLength(1);
    const item = items[0];
    expect(item.allocations).toHaveLength(2);

    const chiomaAlloc = item.allocations.find(a => a.memberId === chiomaUser.id);
    expect(chiomaAlloc).toBeDefined();
    expect(chiomaAlloc.quantity).toBe(2);
    expect(chiomaAlloc.paid).toBe(true);

    const afamAlloc = item.allocations.find(a => a.memberId === afamUser.id);
    expect(afamAlloc).toBeDefined();
    expect(afamAlloc.quantity).toBe(3);
    expect(afamAlloc.paid).toBe(false);

    // Overall payment fulfillment update
    const paymentRes = await request(app)
      .patch(`/api/groups/${testGroup.id}/cart/allocations/payment`)
      .set('Authorization', `Bearer ${afamToken}`)
      .send({
        markAll: true,
      });

    expect(paymentRes.status).toBe(200);
    const updatedItem = paymentRes.body.data.items[0];
    expect(updatedItem.allocations.every(a => a.paid === true)).toBe(true);
  });

  // -------------------------------------------------------------
  // Test 4: Non-Member Access Rejection (403 & Socket Error)
  // -------------------------------------------------------------
  test('Non-member access is rejected with 403 on REST and error on Socket.IO', async () => {
    // REST GET cart
    const getRes = await request(app)
      .get(`/api/groups/${testGroup.id}/cart`)
      .set('Authorization', `Bearer ${nonMemberToken}`);

    expect(getRes.status).toBe(403);
    expect(getRes.body.success).toBe(false);
    expect(getRes.body.error).toMatch(/Access denied/i);

    // REST POST item
    const postRes = await request(app)
      .post(`/api/groups/${testGroup.id}/cart/items`)
      .set('Authorization', `Bearer ${nonMemberToken}`)
      .send({
        productId: testProduct.id,
        quantity: 1,
      });

    expect(postRes.status).toBe(403);
    expect(postRes.body.success).toBe(false);

    // Socket.IO join-cart
    nonMemberSocket = await connectSocket(nonMemberToken);
    const socketErrorPromise = new Promise((resolve) => {
      nonMemberSocket.on('error', (err) => {
        resolve(err);
      });
    });

    nonMemberSocket.emit('join-cart', { groupId: testGroup.id });
    const err = await socketErrorPromise;
    expect(err.message).toMatch(/Access denied/i);
  });

  // -------------------------------------------------------------
  // Test 5: Item Removal and Cart Clear (Broadcast cart-cleared)
  // -------------------------------------------------------------
  test('Item removal and clear cart broadcast cart-cleared event to room', async () => {
    if (!chiomaSocket?.connected) {
      chiomaSocket = await connectSocket(chiomaToken);
    }

    // Join room
    await new Promise((resolve) => {
      chiomaSocket.emit('join-cart', { groupId: testGroup.id });
      chiomaSocket.once('joined-cart', () => resolve());
    });

    // Afam adds item
    await request(app)
      .post(`/api/groups/${testGroup.id}/cart/items`)
      .set('Authorization', `Bearer ${afamToken}`)
      .send({
        productId: testProduct.id,
        quantity: 2,
      });

    // Remove single item
    const removeRes = await request(app)
      .delete(`/api/groups/${testGroup.id}/cart/items/${testProduct.id}`)
      .set('Authorization', `Bearer ${afamToken}`);

    expect(removeRes.status).toBe(200);
    expect(removeRes.body.data.items).toHaveLength(0);

    // Afam re-adds item
    await request(app)
      .post(`/api/groups/${testGroup.id}/cart/items`)
      .set('Authorization', `Bearer ${afamToken}`)
      .send({
        productId: testProduct.id,
        quantity: 3,
      });

    // Setup clear listener
    const clearPromise = new Promise((resolve) => {
      chiomaSocket.on('cart-cleared', (payload) => {
        resolve(payload);
      });
    });

    // Afam clears the cart
    const clearRes = await request(app)
      .delete(`/api/groups/${testGroup.id}/cart`)
      .set('Authorization', `Bearer ${afamToken}`);

    expect(clearRes.status).toBe(200);
    expect(clearRes.body.success).toBe(true);

    const clearPayload = await clearPromise;
    expect(clearPayload.groupId).toBe(testGroup.id);
    expect(clearPayload.clearedBy).toBe(afamUser.id);
  });

  // -------------------------------------------------------------
  // Test 6: UUID Route and Body Parameter Validation
  // -------------------------------------------------------------
  test('UUID route and body parameter validation: rejects invalid UUID formats with 400 Bad Request', async () => {
    // Invalid groupId
    const res1 = await request(app)
      .get('/api/groups/not-a-uuid/cart')
      .set('Authorization', `Bearer ${afamToken}`);
    expect(res1.status).toBe(400);
    expect(res1.body.error).toMatch(/Invalid group ID format/i);

    // Invalid productId in addToGroupCart
    const res2 = await request(app)
      .post(`/api/groups/${testGroup.id}/cart/items`)
      .set('Authorization', `Bearer ${afamToken}`)
      .send({ productId: 'invalid-prod-uuid', quantity: 1 });
    expect(res2.status).toBe(400);
    expect(res2.body.error).toMatch(/Valid product ID is required/i);

    // Invalid memberId in addToGroupCart
    const res3 = await request(app)
      .post(`/api/groups/${testGroup.id}/cart/items`)
      .set('Authorization', `Bearer ${afamToken}`)
      .send({ productId: testProduct.id, quantity: 1, memberId: 'invalid-member-uuid' });
    expect(res3.status).toBe(400);
    expect(res3.body.error).toMatch(/Invalid member ID format/i);

    // Invalid productId in updateCartItemQuantity
    const res4 = await request(app)
      .patch(`/api/groups/${testGroup.id}/cart/items/invalid-prod-uuid`)
      .set('Authorization', `Bearer ${afamToken}`)
      .send({ quantity: 2 });
    expect(res4.status).toBe(400);
    expect(res4.body.error).toMatch(/Invalid product ID format/i);

    // Invalid memberId in updateCartAllocation
    const res5 = await request(app)
      .patch(`/api/groups/${testGroup.id}/cart/items/${testProduct.id}/allocations/invalid-member-uuid`)
      .set('Authorization', `Bearer ${afamToken}`)
      .send({ quantity: 2 });
    expect(res5.status).toBe(400);
    expect(res5.body.error).toMatch(/Invalid UUID format/i);

    // Invalid memberId in updatePaymentFulfillment
    const res6 = await request(app)
      .patch(`/api/groups/${testGroup.id}/cart/allocations/payment`)
      .set('Authorization', `Bearer ${afamToken}`)
      .send({ memberId: 'invalid-member-uuid', paid: true });
    expect(res6.status).toBe(400);
    expect(res6.body.error).toMatch(/Invalid member ID format/i);
  });

  // -------------------------------------------------------------
  // Test 7: Integer Validation & 32-bit Overflow Bounds
  // -------------------------------------------------------------
  test('Integer validation & overflow guards: NaN, non-positive item quantities, and > 2147483647 return 400', async () => {
    // NaN quantity in addToGroupCart
    const res1 = await request(app)
      .post(`/api/groups/${testGroup.id}/cart/items`)
      .set('Authorization', `Bearer ${afamToken}`)
      .send({ productId: testProduct.id, quantity: 'abc' });
    expect(res1.status).toBe(400);
    expect(res1.body.error).toMatch(/positive integer/i);

    // 0 quantity in addToGroupCart
    const res2 = await request(app)
      .post(`/api/groups/${testGroup.id}/cart/items`)
      .set('Authorization', `Bearer ${afamToken}`)
      .send({ productId: testProduct.id, quantity: 0 });
    expect(res2.status).toBe(400);

    // Overflow quantity in addToGroupCart
    const res3 = await request(app)
      .post(`/api/groups/${testGroup.id}/cart/items`)
      .set('Authorization', `Bearer ${afamToken}`)
      .send({ productId: testProduct.id, quantity: 9999999999 });
    expect(res3.status).toBe(400);

    // Seed item
    await request(app)
      .post(`/api/groups/${testGroup.id}/cart/items`)
      .set('Authorization', `Bearer ${afamToken}`)
      .send({ productId: testProduct.id, quantity: 5 });

    // NaN quantity in updateCartItemQuantity
    const res4 = await request(app)
      .patch(`/api/groups/${testGroup.id}/cart/items/${testProduct.id}`)
      .set('Authorization', `Bearer ${afamToken}`)
      .send({ quantity: 'not_a_num' });
    expect(res4.status).toBe(400);

    // NaN delta in updateCartItemQuantity
    const res5 = await request(app)
      .patch(`/api/groups/${testGroup.id}/cart/items/${testProduct.id}`)
      .set('Authorization', `Bearer ${afamToken}`)
      .send({ delta: 'bad_delta' });
    expect(res5.status).toBe(400);

    // Negative allocation quantity in updateCartAllocation
    const res6 = await request(app)
      .patch(`/api/groups/${testGroup.id}/cart/items/${testProduct.id}/allocations/${afamUser.id}`)
      .set('Authorization', `Bearer ${afamToken}`)
      .send({ quantity: -1 });
    expect(res6.status).toBe(400);
    expect(res6.body.error).toMatch(/non-negative integer/i);
  });

  // -------------------------------------------------------------
  // Test 8: Allocation Reduction & Total Quantity Invariant Reconciliation
  // -------------------------------------------------------------
  test('Allocation reduction reconciles total quantity to eliminate ghost unallocated items', async () => {
    // Afam adds 4 units, Chioma adds 6 units -> Total 10
    await request(app)
      .post(`/api/groups/${testGroup.id}/cart/items`)
      .set('Authorization', `Bearer ${afamToken}`)
      .send({ productId: testProduct.id, quantity: 4 });

    await request(app)
      .post(`/api/groups/${testGroup.id}/cart/items`)
      .set('Authorization', `Bearer ${chiomaToken}`)
      .send({ productId: testProduct.id, quantity: 6 });

    // Both members reduce their allocations to 1 unit each
    await request(app)
      .patch(`/api/groups/${testGroup.id}/cart/items/${testProduct.id}/allocations/${afamUser.id}`)
      .set('Authorization', `Bearer ${afamToken}`)
      .send({ quantity: 1 });

    const patchRes = await request(app)
      .patch(`/api/groups/${testGroup.id}/cart/items/${testProduct.id}/allocations/${chiomaUser.id}`)
      .set('Authorization', `Bearer ${chiomaToken}`)
      .send({ quantity: 1 });

    expect(patchRes.status).toBe(200);
    const item = patchRes.body.data.items[0];

    // Reconciled total quantity must equal sum of allocations (1 + 1 = 2), eliminating phantom ghost quantities
    const sumAllocations = item.allocations.reduce((sum, a) => sum + a.quantity, 0);
    expect(sumAllocations).toBe(2);
    expect(item.quantity).toBe(2);
  });

  // -------------------------------------------------------------
  // Test 9: Payment Fulfillment Reversal (markAll with paid: false)
  // -------------------------------------------------------------
  test('Payment fulfillment: markAll: true marks all paid, and markAll: true with paid: false resets to unpaid', async () => {
    // Afam adds 2 units
    await request(app)
      .post(`/api/groups/${testGroup.id}/cart/items`)
      .set('Authorization', `Bearer ${afamToken}`)
      .send({ productId: testProduct.id, quantity: 2 });

    // Mark all paid
    const markRes = await request(app)
      .patch(`/api/groups/${testGroup.id}/cart/allocations/payment`)
      .set('Authorization', `Bearer ${afamToken}`)
      .send({ markAll: true });

    expect(markRes.status).toBe(200);
    expect(markRes.body.data.items[0].allocations.every(a => a.paid === true)).toBe(true);

    // Unmark all paid
    const unmarkRes = await request(app)
      .patch(`/api/groups/${testGroup.id}/cart/allocations/payment`)
      .set('Authorization', `Bearer ${afamToken}`)
      .send({ markAll: true, paid: false });

    expect(unmarkRes.status).toBe(200);
    expect(unmarkRes.body.data.items[0].allocations.every(a => a.paid === false)).toBe(true);
  });
});
