/**
 * Challenger M2 Adversarial Test Suite
 *
 * Rigorously stress-tests:
 * 1. Race conditions in concurrent cart additions and allocation updates.
 * 2. Quantity edge cases: zero/negative, NaN, overflow, and sum-vs-total mismatches.
 * 3. Deletion cascade: item deletion, cart clear, and foreign key cascades.
 * 4. Payment fulfillment edge cases: markAll vs individual toggles, invalid UUIDs, and unmark behaviors.
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

describe('Challenger M2 Adversarial Test Suite', () => {
  let app;
  let httpServer;
  let io;
  let serverPort;

  let memberA;
  let memberB;
  let memberC;
  let testGroup1;
  let testGroup2;
  let product1;
  let product2;

  let tokenA;
  let tokenB;
  let tokenC;

  beforeAll(async () => {
    // 1. Setup distinct test users
    const client = await pool.connect();
    try {
      // Clean up any stale test groups and users
      await client.query(`
        DELETE FROM groups WHERE created_by IN (
          SELECT id FROM users WHERE email IN ('m2_adv_a@example.com', 'm2_adv_b@example.com', 'm2_adv_c@example.com')
        );
        DELETE FROM users WHERE email IN ('m2_adv_a@example.com', 'm2_adv_b@example.com', 'm2_adv_c@example.com');
      `);

      const usersRes = await client.query(`
        INSERT INTO users (email, password_hash, name, role)
        VALUES 
          ('m2_adv_a@example.com', 'hash', 'Adv Member A', 'member'),
          ('m2_adv_b@example.com', 'hash', 'Adv Member B', 'member'),
          ('m2_adv_c@example.com', 'hash', 'Adv Member C', 'member')
        RETURNING id, email, name, role;
      `);
      memberA = usersRes.rows.find(u => u.email === 'm2_adv_a@example.com');
      memberB = usersRes.rows.find(u => u.email === 'm2_adv_b@example.com');
      memberC = usersRes.rows.find(u => u.email === 'm2_adv_c@example.com');

      // 2. Create test groups
      const gRes1 = await client.query(`
        INSERT INTO groups (name, join_code, moq_target, status, created_by)
        VALUES ('Adv Cart Test Group 1', 'ADVCART01', 50, 'active', $1)
        RETURNING id;
      `, [memberA.id]);
      testGroup1 = gRes1.rows[0];

      const gRes2 = await client.query(`
        INSERT INTO groups (name, join_code, moq_target, status, created_by)
        VALUES ('Adv Cart Test Group 2', 'ADVCART02', 50, 'active', $1)
        RETURNING id;
      `, [memberA.id]);
      testGroup2 = gRes2.rows[0];

      // Add members to testGroup1: Member A and Member B
      await client.query(`
        INSERT INTO group_members (group_id, user_id, role)
        VALUES 
          ($1, $2, 'admin'),
          ($1, $3, 'member');
      `, [testGroup1.id, memberA.id, memberB.id]);

      // Add member to testGroup2: Member A only
      await client.query(`
        INSERT INTO group_members (group_id, user_id, role)
        VALUES ($1, $2, 'admin');
      `, [testGroup2.id, memberA.id]);

      // 3. Get products
      const pRes = await client.query(`SELECT id, name, bulk_price FROM products LIMIT 2;`);
      product1 = pRes.rows[0];
      product2 = pRes.rows[1];
    } finally {
      client.release();
    }

    tokenA = generateToken(memberA.id, memberA.role);
    tokenB = generateToken(memberB.id, memberB.role);
    tokenC = generateToken(memberC.id, memberC.role); // Not in group 1 or 2

    // 4. Setup Express & Socket.IO server
    app = express();
    app.use(express.json());
    httpServer = http.createServer(app);

    io = new Server(httpServer, { cors: { origin: '*' } });
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
    const client = await pool.connect();
    try {
      await client.query(`
        DELETE FROM groups WHERE created_by IN (
          SELECT id FROM users WHERE email IN ('m2_adv_a@example.com', 'm2_adv_b@example.com', 'm2_adv_c@example.com')
        );
      `);
      if (testGroup1?.id) {
        await client.query('DELETE FROM groups WHERE id = $1', [testGroup1.id]);
      }
      if (testGroup2?.id) {
        await client.query('DELETE FROM groups WHERE id = $1', [testGroup2.id]);
      }
      await client.query(`
        DELETE FROM users WHERE email IN ('m2_adv_a@example.com', 'm2_adv_b@example.com', 'm2_adv_c@example.com');
      `);
    } finally {
      client.release();
    }

    if (io) io.close();
    if (httpServer) await new Promise((resolve) => httpServer.close(resolve));
  });

  beforeEach(async () => {
    if (testGroup1?.id) {
      await pool.query('DELETE FROM group_cart_items WHERE group_id = $1', [testGroup1.id]);
    }
    if (testGroup2?.id) {
      await pool.query('DELETE FROM group_cart_items WHERE group_id = $1', [testGroup2.id]);
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

  // =========================================================================
  // 1. CONCURRENCY & RACE CONDITIONS
  // =========================================================================
  describe('1. Concurrency & Race Conditions', () => {
    test('1.1 Concurrent addToGroupCart from multiple members correctly accumulates quantities without loss', async () => {
      // 10 concurrent requests: 5 from Member A (2 units each = 10) and 5 from Member B (3 units each = 15)
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app)
            .post(`/api/groups/${testGroup1.id}/cart/items`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ productId: product1.id, quantity: 2 })
        );
        requests.push(
          request(app)
            .post(`/api/groups/${testGroup1.id}/cart/items`)
            .set('Authorization', `Bearer ${tokenB}`)
            .send({ productId: product1.id, quantity: 3 })
        );
      }

      const responses = await Promise.all(requests);
      for (const res of responses) {
        expect(res.status).toBe(201);
      }

      // Fetch final cart from DB
      const getRes = await request(app)
        .get(`/api/groups/${testGroup1.id}/cart`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(getRes.status).toBe(200);
      const items = getRes.body.data.items;
      expect(items).toHaveLength(1);
      const item = items[0];

      // Total quantity should be 5*2 + 5*3 = 25
      expect(item.quantity).toBe(25);

      const allocA = item.allocations.find(a => a.memberId === memberA.id);
      const allocB = item.allocations.find(a => a.memberId === memberB.id);

      expect(allocA).toBeDefined();
      expect(allocA.quantity).toBe(10);
      expect(allocB).toBeDefined();
      expect(allocB.quantity).toBe(15);

      // Invariant: sum of member allocations must equal total quantity
      const sumAllocations = item.allocations.reduce((sum, a) => sum + a.quantity, 0);
      expect(sumAllocations).toBe(item.quantity);
    });

    test('1.2 Concurrent updateCartItemQuantity delta updates (read-modify-write race condition probe)', async () => {
      // Seed item with 10 units: 5 for A, 5 for B
      await request(app)
        .post(`/api/groups/${testGroup1.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ productId: product1.id, quantity: 5 });

      await request(app)
        .post(`/api/groups/${testGroup1.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ productId: product1.id, quantity: 5 });

      // Member A sends delta: +2, Member B sends delta: +3 concurrently
      const [resA, resB] = await Promise.all([
        request(app)
          .patch(`/api/groups/${testGroup1.id}/cart/items/${product1.id}`)
          .set('Authorization', `Bearer ${tokenA}`)
          .send({ delta: 2 }),
        request(app)
          .patch(`/api/groups/${testGroup1.id}/cart/items/${product1.id}`)
          .set('Authorization', `Bearer ${tokenB}`)
          .send({ delta: 3 }),
      ]);

      expect(resA.status).toBe(200);
      expect(resB.status).toBe(200);

      const finalRes = await request(app)
        .get(`/api/groups/${testGroup1.id}/cart`)
        .set('Authorization', `Bearer ${tokenA}`);

      const item = finalRes.body.data.items[0];
      const sumAllocations = item.allocations.reduce((sum, a) => sum + a.quantity, 0);

      // Check if read-modify-write lost an update or created a total-allocation divergence
      console.log('Concurrent delta update test: item.quantity =', item.quantity, ', sumAllocations =', sumAllocations);
      // Invariant: Total item quantity must never be less than the sum of member allocations
      expect(item.quantity).toBeGreaterThanOrEqual(sumAllocations);
    });

    test('1.3 Concurrent updateCartAllocation from both members simultaneously', async () => {
      // Seed item
      await request(app)
        .post(`/api/groups/${testGroup1.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ productId: product1.id, quantity: 2 });

      // Concurrently update allocations
      const [resA, resB] = await Promise.all([
        request(app)
          .patch(`/api/groups/${testGroup1.id}/cart/items/${product1.id}/allocations/${memberA.id}`)
          .set('Authorization', `Bearer ${tokenA}`)
          .send({ quantity: 8 }),
        request(app)
          .patch(`/api/groups/${testGroup1.id}/cart/items/${product1.id}/allocations/${memberB.id}`)
          .set('Authorization', `Bearer ${tokenB}`)
          .send({ quantity: 12 }),
      ]);

      expect(resA.status).toBe(200);
      expect(resB.status).toBe(200);

      const finalRes = await request(app)
        .get(`/api/groups/${testGroup1.id}/cart`)
        .set('Authorization', `Bearer ${tokenA}`);

      const item = finalRes.body.data.items[0];
      const allocA = item.allocations.find(a => a.memberId === memberA.id);
      const allocB = item.allocations.find(a => a.memberId === memberB.id);

      expect(allocA.quantity).toBe(8);
      expect(allocB.quantity).toBe(12);

      // Reconciled total quantity must accommodate the updated allocations (>= 20)
      expect(item.quantity).toBeGreaterThanOrEqual(20);
    });

    test('1.4 Concurrent updateCartAllocation for a new member (race condition on initial INSERT without ON CONFLICT)', async () => {
      // Seed item with allocation for Member A only
      await request(app)
        .post(`/api/groups/${testGroup1.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ productId: product1.id, quantity: 2 });

      // Member B has NO allocation yet. Fire two concurrent allocation updates for Member B!
      const [res1, res2] = await Promise.all([
        request(app)
          .patch(`/api/groups/${testGroup1.id}/cart/items/${product1.id}/allocations/${memberB.id}`)
          .set('Authorization', `Bearer ${tokenB}`)
          .send({ quantity: 4 }),
        request(app)
          .patch(`/api/groups/${testGroup1.id}/cart/items/${product1.id}/allocations/${memberB.id}`)
          .set('Authorization', `Bearer ${tokenB}`)
          .send({ quantity: 5 }),
      ]);

      console.log('Concurrent initial allocation insert statuses:', res1.status, res2.status);
      // Both should succeed gracefully or be handled with 200, neither should crash with 500 unique constraint violation
      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
    });
  });

  // =========================================================================
  // 2. QUANTITY EDGE CASES & ALLOCATION INVARIANTS
  // =========================================================================
  describe('2. Quantity Edge Cases', () => {
    test('2.1 Zero, negative, and non-numeric quantities in addToGroupCart', async () => {
      // 0 quantity rejected
      const zeroRes = await request(app)
        .post(`/api/groups/${testGroup1.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ productId: product1.id, quantity: 0 });
      expect(zeroRes.status).toBe(400);
      expect(zeroRes.body.error).toMatch(/positive integer/i);

      // Negative quantity rejected
      const negRes = await request(app)
        .post(`/api/groups/${testGroup1.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ productId: product1.id, quantity: -5 });
      expect(negRes.status).toBe(400);

      // Non-numeric string quantity rejected
      const nanRes = await request(app)
        .post(`/api/groups/${testGroup1.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ productId: product1.id, quantity: 'not_a_number' });
      expect(nanRes.status).toBe(400);
    });

    test('2.2 Non-numeric / NaN input in updateCartItemQuantity should not crash server with 500', async () => {
      // Seed item
      await request(app)
        .post(`/api/groups/${testGroup1.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ productId: product1.id, quantity: 5 });

      // Send NaN quantity
      const nanRes = await request(app)
        .patch(`/api/groups/${testGroup1.id}/cart/items/${product1.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ quantity: 'invalid_string' });

      // Should be rejected gracefully with 400 or handled safely, NOT crash with unhandled 500
      console.log('updateCartItemQuantity with NaN quantity returned status:', nanRes.status);
      expect([400, 422]).toContain(nanRes.status);
    });

    test('2.3 Non-numeric / NaN input in updateCartAllocation should not crash server with 500', async () => {
      // Seed item
      await request(app)
        .post(`/api/groups/${testGroup1.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ productId: product1.id, quantity: 5 });

      // Send NaN allocation quantity
      const nanAllocRes = await request(app)
        .patch(`/api/groups/${testGroup1.id}/cart/items/${product1.id}/allocations/${memberA.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ quantity: 'invalid_qty' });

      console.log('updateCartAllocation with NaN quantity returned status:', nanAllocRes.status);
      expect([400, 422]).toContain(nanAllocRes.status);
    });

    test('2.4 Integer overflow input (e.g. 3000000000) should not cause unhandled 500', async () => {
      const overflowRes = await request(app)
        .post(`/api/groups/${testGroup1.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ productId: product1.id, quantity: 3000000000 });

      console.log('Integer overflow returned status:', overflowRes.status);
      expect([400, 422]).toContain(overflowRes.status);
    });

    test('2.5 Allocation vs Total Quantity discrepancy: Downward total adjustment below sum of member allocations', async () => {
      // Seed cart with 10 units: 5 for Member A, 5 for Member B
      await request(app)
        .post(`/api/groups/${testGroup1.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ productId: product1.id, quantity: 5 });

      await request(app)
        .post(`/api/groups/${testGroup1.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ productId: product1.id, quantity: 5 });

      // Now Member A lowers total cart quantity to 2
      const adjustRes = await request(app)
        .patch(`/api/groups/${testGroup1.id}/cart/items/${product1.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ quantity: 2 });

      expect(adjustRes.status).toBe(200);

      const finalRes = await request(app)
        .get(`/api/groups/${testGroup1.id}/cart`)
        .set('Authorization', `Bearer ${tokenA}`);

      const item = finalRes.body.data.items[0];
      const sumAllocations = item.allocations.reduce((sum, a) => sum + a.quantity, 0);

      console.log(`Downward adjustment test: item.quantity = ${item.quantity}, sumAllocations = ${sumAllocations}`);
      console.log('Allocations detail:', item.allocations);

      // Invariant: The sum of member allocations must NEVER exceed the total cart item quantity
      // If sumAllocations > item.quantity, members believe they are buying 5 items from a cart of 2!
      expect(sumAllocations).toBeLessThanOrEqual(item.quantity);
    });

    test('2.6 Member allocation reduction preserves or reconciles total quantity cleanly', async () => {
      // Seed cart with 10 units: 5 for A, 5 for B
      await request(app)
        .post(`/api/groups/${testGroup1.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ productId: product1.id, quantity: 5 });

      await request(app)
        .post(`/api/groups/${testGroup1.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ productId: product1.id, quantity: 5 });

      // Member A reduces allocation to 1
      const patchAllocRes = await request(app)
        .patch(`/api/groups/${testGroup1.id}/cart/items/${product1.id}/allocations/${memberA.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ quantity: 1 });

      expect(patchAllocRes.status).toBe(200);
      const item = patchAllocRes.body.data.items[0];
      const allocA = item.allocations.find(a => a.memberId === memberA.id);
      expect(allocA.quantity).toBe(1);
    });
  });

  // =========================================================================
  // 3. DELETION CASCADE & GROUP ISOLATION
  // =========================================================================
  describe('3. Deletion Cascade & Group Isolation', () => {
    test('3.1 Removing a cart item cascades deletions of all its allocations in DB', async () => {
      // Seed item with allocations for both members
      await request(app)
        .post(`/api/groups/${testGroup1.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ productId: product1.id, quantity: 3 });

      await request(app)
        .post(`/api/groups/${testGroup1.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ productId: product1.id, quantity: 4 });

      // Verify item exists in DB
      const dbItemRes = await pool.query(
        'SELECT id FROM group_cart_items WHERE group_id = $1 AND product_id = $2',
        [testGroup1.id, product1.id]
      );
      expect(dbItemRes.rows).toHaveLength(1);
      const cartItemId = dbItemRes.rows[0].id;

      // Verify allocations exist
      const allocResBefore = await pool.query(
        'SELECT id FROM group_cart_allocations WHERE cart_item_id = $1',
        [cartItemId]
      );
      expect(allocResBefore.rows.length).toBe(2);

      // DELETE item via REST
      const delRes = await request(app)
        .delete(`/api/groups/${testGroup1.id}/cart/items/${product1.id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.data.items).toHaveLength(0);

      // Verify database cascade: NO orphaned allocations
      const allocResAfter = await pool.query(
        'SELECT id FROM group_cart_allocations WHERE cart_item_id = $1',
        [cartItemId]
      );
      expect(allocResAfter.rows).toHaveLength(0);
    });

    test('3.2 Clearing Group 1 cart leaves Group 2 cart intact (Cross-Group Isolation)', async () => {
      // Add items to Group 1
      await request(app)
        .post(`/api/groups/${testGroup1.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ productId: product1.id, quantity: 5 });

      // Add items to Group 2
      await request(app)
        .post(`/api/groups/${testGroup2.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ productId: product2.id, quantity: 7 });

      // Clear Group 1 cart
      const clearRes = await request(app)
        .delete(`/api/groups/${testGroup1.id}/cart`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(clearRes.status).toBe(200);

      // Verify Group 1 is empty
      const g1Res = await request(app)
        .get(`/api/groups/${testGroup1.id}/cart`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(g1Res.body.data.items).toHaveLength(0);

      // Verify Group 2 is intact with 7 units
      const g2Res = await request(app)
        .get(`/api/groups/${testGroup2.id}/cart`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(g2Res.body.data.items).toHaveLength(1);
      expect(g2Res.body.data.items[0].productId).toBe(product2.id);
      expect(g2Res.body.data.items[0].quantity).toBe(7);
    });

    test('3.3 Database foreign key ON DELETE CASCADE when group is removed', async () => {
      // Create temporary group
      const tempG = await pool.query(`
        INSERT INTO groups (name, join_code, moq_target, status, created_by)
        VALUES ('Temp Cascade Group', 'TEMPCASC01', 10, 'active', $1)
        RETURNING id;
      `, [memberA.id]);
      const tempGroupId = tempG.rows[0].id;

      await pool.query(`
        INSERT INTO group_members (group_id, user_id, role)
        VALUES ($1, $2, 'admin');
      `, [tempGroupId, memberA.id]);

      // Add item and allocation
      await request(app)
        .post(`/api/groups/${tempGroupId}/cart/items`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ productId: product1.id, quantity: 4 });

      // Delete group directly from DB
      await pool.query('DELETE FROM groups WHERE id = $1', [tempGroupId]);

      // Verify group_cart_items and group_cart_allocations cascaded cleanly
      const itemsLeft = await pool.query('SELECT id FROM group_cart_items WHERE group_id = $1', [tempGroupId]);
      expect(itemsLeft.rows).toHaveLength(0);
    });
  });

  // =========================================================================
  // 4. PAYMENT FULFILLMENT EDGE CASES
  // =========================================================================
  describe('4. Payment Fulfillment Edge Cases', () => {
    test('4.1 markAll: true marks all allocations across multiple items paid', async () => {
      // Add product 1 and product 2
      await request(app)
        .post(`/api/groups/${testGroup1.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ productId: product1.id, quantity: 2 });
      await request(app)
        .post(`/api/groups/${testGroup1.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ productId: product1.id, quantity: 3 });

      await request(app)
        .post(`/api/groups/${testGroup1.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ productId: product2.id, quantity: 4 });

      // Mark all paid
      const payRes = await request(app)
        .patch(`/api/groups/${testGroup1.id}/cart/allocations/payment`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ markAll: true });

      expect(payRes.status).toBe(200);
      const items = payRes.body.data.items;
      expect(items).toHaveLength(2);

      for (const item of items) {
        for (const alloc of item.allocations) {
          expect(alloc.paid).toBe(true);
        }
      }
    });

    test('4.2 Individual member payment toggle: toggles paid true and false without affecting other members', async () => {
      // Add items for A and B
      await request(app)
        .post(`/api/groups/${testGroup1.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ productId: product1.id, quantity: 2 });
      await request(app)
        .post(`/api/groups/${testGroup1.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ productId: product1.id, quantity: 3 });

      // Toggle Member A paid: true
      const payA = await request(app)
        .patch(`/api/groups/${testGroup1.id}/cart/allocations/payment`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ memberId: memberA.id, paid: true });

      expect(payA.status).toBe(200);
      let allocA = payA.body.data.items[0].allocations.find(a => a.memberId === memberA.id);
      let allocB = payA.body.data.items[0].allocations.find(a => a.memberId === memberB.id);
      expect(allocA.paid).toBe(true);
      expect(allocB.paid).toBe(false);

      // Toggle Member A paid: false
      const unpayA = await request(app)
        .patch(`/api/groups/${testGroup1.id}/cart/allocations/payment`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ memberId: memberA.id, paid: false });

      expect(unpayA.status).toBe(200);
      allocA = unpayA.body.data.items[0].allocations.find(a => a.memberId === memberA.id);
      expect(allocA.paid).toBe(false);
    });

    test('4.3 Invalid input: missing markAll and memberId returns 400', async () => {
      const res = await request(app)
        .patch(`/api/groups/${testGroup1.id}/cart/allocations/payment`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Either markAll or memberId/i);
    });

    test('4.4 Invalid UUID for memberId in payment toggle should not crash server with 500', async () => {
      const res = await request(app)
        .patch(`/api/groups/${testGroup1.id}/cart/allocations/payment`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ memberId: 'not-a-valid-uuid', paid: true });

      console.log('Invalid UUID payment toggle returned status:', res.status);
      expect([400, 422]).toContain(res.status);
    });

    test('4.5 Non-member payment toggle: User C (not in group) cannot modify payment fulfillment', async () => {
      const res = await request(app)
        .patch(`/api/groups/${testGroup1.id}/cart/allocations/payment`)
        .set('Authorization', `Bearer ${tokenC}`)
        .send({ markAll: true });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Access denied/i);
    });

    test('4.6 markAll with paid: false should unmark all allocations instead of hardcoding paid: true', async () => {
      // Seed item and mark all paid
      await request(app)
        .post(`/api/groups/${testGroup1.id}/cart/items`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ productId: product1.id, quantity: 2 });
      await request(app)
        .patch(`/api/groups/${testGroup1.id}/cart/allocations/payment`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ markAll: true, paid: true });

      // Attempt to unmark all paid using paid: false
      const unmarkRes = await request(app)
        .patch(`/api/groups/${testGroup1.id}/cart/allocations/payment`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ markAll: true, paid: false });

      expect(unmarkRes.status).toBe(200);
      const item = unmarkRes.body.data.items[0];
      const allPaid = item.allocations.every(a => a.paid === true);
      console.log('markAll with paid: false result: are all allocations still paid?', allPaid);
      // If markAll honors paid: false, allPaid should be false
      expect(allPaid).toBe(false);
    });
  });
});
