/**
 * Challenger 2 Adversarial Stress Test Suite
 * Evaluates:
 * 1. Controller collision fix in chat.controller.js (createGroupVendorConversation)
 * 2. Authenticity & coverage of dynamic triggers
 * 3. Sensitivity and completeness of FK integrity queries across 11+ tables
 */
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import pool from '../config/database.js';
import { createGroupVendorConversation } from '../controllers/chat.controller.js';

describe('Challenger 2 Adversarial Stress Suite', () => {
  let testGroupId;
  let adminUserId;
  let memberUserId;
  let vendorUserId;

  beforeAll(async () => {
    // Setup test users and group
    const client = await pool.connect();
    try {
      const uRes = await client.query(`
        INSERT INTO users (email, password_hash, name, role)
        VALUES 
          ('adv_admin@example.com', 'hash', 'Adv Admin', 'member'),
          ('adv_member@example.com', 'hash', 'Adv Member', 'member'),
          ('adv_vendor@example.com', 'hash', 'Adv Vendor', 'vendor')
        RETURNING id, role, email
      `);
      adminUserId = uRes.rows.find(r => r.email === 'adv_admin@example.com').id;
      memberUserId = uRes.rows.find(r => r.email === 'adv_member@example.com').id;
      vendorUserId = uRes.rows.find(r => r.email === 'adv_vendor@example.com').id;

      const gRes = await client.query(`
        INSERT INTO groups (name, join_code, moq_target, status, created_by)
        VALUES ('Adv Stress Group', 'ADVCODE99', 20, 'active', $1)
        RETURNING id
      `, [adminUserId]);
      testGroupId = gRes.rows[0].id;

      await client.query(`
        INSERT INTO group_members (group_id, user_id, role)
        VALUES 
          ($1, $2, 'admin'),
          ($1, $3, 'member')
      `, [testGroupId, adminUserId, memberUserId]);
    } finally {
      client.release();
    }
  });

  afterAll(async () => {
    const client = await pool.connect();
    try {
      if (testGroupId) {
        await client.query('DELETE FROM groups WHERE id = $1', [testGroupId]);
      }
      await client.query(`
        DELETE FROM users WHERE email IN (
          'adv_admin@example.com',
          'adv_member@example.com',
          'adv_vendor@example.com'
        )
      `);
    } finally {
      client.release();
      await pool.end();
    }
  });

  // =========================================================================
  // 1. Controller Collision Fix Verification on Real Database
  // =========================================================================
  describe('Adversarial Check 1: Controller Collision Fix in chat.controller.js', () => {
    test('createGroupVendorConversation executes against real PostgreSQL without duplicate key violation', async () => {
      let statusCode = null;
      let jsonBody = null;

      const req = {
        user: { id: adminUserId },
        body: { groupId: testGroupId, vendorId: vendorUserId },
        app: { get: () => null }
      };

      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonBody = data;
          return this;
        }
      };

      // Call the REAL controller function against the REAL database
      await createGroupVendorConversation(req, res);

      expect(statusCode).toBe(201);
      expect(jsonBody).toBeDefined();
      expect(jsonBody.success).toBe(true);
      expect(jsonBody.data).toBeDefined();
      expect(jsonBody.data.id).toBeDefined();
      const conversationId = jsonBody.data.id;

      // Verify participants in DB
      const participants = await pool.query(`
        SELECT user_id, role, can_send 
        FROM conversation_participants 
        WHERE conversation_id = $1
      `, [conversationId]);

      expect(participants.rows).toHaveLength(3);

      const adminPart = participants.rows.find(p => p.user_id === adminUserId);
      const memberPart = participants.rows.find(p => p.user_id === memberUserId);
      const vendorPart = participants.rows.find(p => p.user_id === vendorUserId);

      expect(adminPart).toBeDefined();
      expect(adminPart.role).toBe('admin');
      expect(adminPart.can_send).toBe(true);

      expect(memberPart).toBeDefined();
      expect(memberPart.role).toBe('member');
      expect(memberPart.can_send).toBe(false);

      expect(vendorPart).toBeDefined();
      expect(vendorPart.role).toBe('vendor');
      expect(vendorPart.can_send).toBe(true);
    });

    test('re-calling createGroupVendorConversation returns 200 with existing conversation message', async () => {
      let statusCode = null;
      let jsonBody = null;

      const req = {
        user: { id: adminUserId },
        body: { groupId: testGroupId, vendorId: vendorUserId },
        app: { get: () => null }
      };

      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonBody = data;
          return this;
        }
      };

      await createGroupVendorConversation(req, res);

      expect(statusCode).toBeNull(); // defaults to res.json without res.status
      expect(jsonBody.success).toBe(true);
      expect(jsonBody.message).toBe('Conversation already exists');
    });

    test('non-admin user calling createGroupVendorConversation is rejected with 403', async () => {
      let statusCode = null;
      let jsonBody = null;

      const req = {
        user: { id: memberUserId }, // non-admin
        body: { groupId: testGroupId, vendorId: vendorUserId },
        app: { get: () => null }
      };

      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonBody = data;
          return this;
        }
      };

      await createGroupVendorConversation(req, res);

      expect(statusCode).toBe(403);
      expect(jsonBody.error).toBe('Only group admins can initiate vendor conversations');
    });

    test('vendor user already in group_members does not get demoted when conversation is created', async () => {
      let gId;
      try {
        // Create a new committed group where vendor is in group_members
        const gRes = await pool.query(`
          INSERT INTO groups (name, join_code, moq_target, status, created_by)
          VALUES ('Adv Vendor Member Group', 'ADVVMG1', 10, 'active', $1)
          RETURNING id
        `, [adminUserId]);
        gId = gRes.rows[0].id;

        await pool.query(`
          INSERT INTO group_members (group_id, user_id, role)
          VALUES ($1, $2, 'admin'), ($1, $3, 'member')
        `, [gId, adminUserId, vendorUserId]);

        let statusCode = null;
        let jsonBody = null;
        const req = {
          user: { id: adminUserId },
          body: { groupId: gId, vendorId: vendorUserId },
          app: { get: () => null }
        };
        const res = {
          status(code) { statusCode = code; return this; },
          json(data) { jsonBody = data; return this; }
        };

        await createGroupVendorConversation(req, res);

        expect(statusCode).toBe(201);
        const convId = jsonBody.data.id;

        const vPart = await pool.query(`
          SELECT role, can_send FROM conversation_participants
          WHERE conversation_id = $1 AND user_id = $2
        `, [convId, vendorUserId]);

        expect(vPart.rows).toHaveLength(1);
        expect(vPart.rows[0].role).toBe('vendor');
        expect(vPart.rows[0].can_send).toBe(true);
      } finally {
        if (gId) {
          await pool.query('DELETE FROM groups WHERE id = $1', [gId]);
        }
      }
    });

    test('concurrent calls to createGroupVendorConversation are handled safely without unhandled error', async () => {
      let gId;
      try {
        const gRes = await pool.query(`
          INSERT INTO groups (name, join_code, moq_target, status, created_by)
          VALUES ('Adv Concurrency Group', 'ADVCONC1', 10, 'active', $1)
          RETURNING id
        `, [adminUserId]);
        gId = gRes.rows[0].id;

        await pool.query(`
          INSERT INTO group_members (group_id, user_id, role)
          VALUES ($1, $2, 'admin'), ($1, $3, 'member')
        `, [gId, adminUserId, memberUserId]);

        const makeCall = async () => {
          let code = null;
          let body = null;
          const req = {
            user: { id: adminUserId },
            body: { groupId: gId, vendorId: vendorUserId },
            app: { get: () => null }
          };
          const res = {
            status(c) { code = c; return this; },
            json(b) { body = b; return this; }
          };
          await createGroupVendorConversation(req, res);
          return { code, body };
        };

        // Fire 2 concurrent requests
        const [r1, r2] = await Promise.all([makeCall(), makeCall()]);

        // One should create (201) and the other should either find existing (null/200) or both cleanly resolve
        const statuses = [r1.code, r2.code];
        expect(statuses).toContain(201);
        expect(r1.body.success).toBe(true);
        expect(r2.body.success).toBe(true);
      } finally {
        if (gId) {
          await pool.query('DELETE FROM groups WHERE id = $1', [gId]);
        }
      }
    });
  });

  // =========================================================================
  // 2. Dynamic Trigger Lifecycle & Immunity Assertions
  // =========================================================================
  describe('Adversarial Check 2: Dynamic Trigger Lifecycle & Role Transition', () => {
    test('updating member role from member to admin dynamically promotes can_send to true', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Find conversation for testGroupId
        const convRes = await client.query(`
          SELECT id FROM conversations WHERE group_id = $1 AND type = 'group-vendor'
        `, [testGroupId]);
        const convId = convRes.rows[0].id;

        // Verify memberUserId currently has can_send = false
        const initial = await client.query(`
          SELECT role, can_send FROM conversation_participants
          WHERE conversation_id = $1 AND user_id = $2
        `, [convId, memberUserId]);
        expect(initial.rows[0].role).toBe('member');
        expect(initial.rows[0].can_send).toBe(false);

        // Update role in group_members to admin
        await client.query(`
          UPDATE group_members SET role = 'admin'
          WHERE group_id = $1 AND user_id = $2
        `, [testGroupId, memberUserId]);

        // Trigger should have fired and updated conversation_participants
        const updated = await client.query(`
          SELECT role, can_send FROM conversation_participants
          WHERE conversation_id = $1 AND user_id = $2
        `, [convId, memberUserId]);
        expect(updated.rows[0].role).toBe('admin');
        expect(updated.rows[0].can_send).toBe(true);

        // Demote back to member
        await client.query(`
          UPDATE group_members SET role = 'member'
          WHERE group_id = $1 AND user_id = $2
        `, [testGroupId, memberUserId]);

        const demoted = await client.query(`
          SELECT role, can_send FROM conversation_participants
          WHERE conversation_id = $1 AND user_id = $2
        `, [convId, memberUserId]);
        expect(demoted.rows[0].role).toBe('member');
        expect(demoted.rows[0].can_send).toBe(false);
      } finally {
        await client.query('ROLLBACK');
        client.release();
      }
    });

    test('group cart items and allocations updated_at trigger updates timestamp on update', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const prod = await client.query('SELECT id FROM products LIMIT 1');
        const prodId = prod.rows[0].id;

        const cartItem = await client.query(`
          INSERT INTO group_cart_items (group_id, product_id, quantity, updated_at)
          VALUES ($1, $2, 5, NOW() - INTERVAL '1 hour')
          RETURNING id, updated_at
        `, [testGroupId, prodId]);

        const oldTime = new Date(cartItem.rows[0].updated_at).getTime();

        await client.query(`
          UPDATE group_cart_items SET quantity = 10 WHERE id = $1
        `, [cartItem.rows[0].id]);

        const newCartItem = await client.query(`
          SELECT updated_at FROM group_cart_items WHERE id = $1
        `, [cartItem.rows[0].id]);

        const newTime = new Date(newCartItem.rows[0].updated_at).getTime();
        expect(newTime).toBeGreaterThan(oldTime);
      } finally {
        await client.query('ROLLBACK');
        client.release();
      }
    });
  });

  // =========================================================================
  // 3. Foreign Key Checks & Query Sensitivity Testing
  // =========================================================================
  describe('Adversarial Check 3: FK Integrity Query Sensitivity across 11+ tables', () => {
    test('12+ tables with seed data have verified non-zero row counts', async () => {
      const tableCounts = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM users) AS users,
          (SELECT COUNT(*) FROM vendors) AS vendors,
          (SELECT COUNT(*) FROM products) AS products,
          (SELECT COUNT(*) FROM groups) AS groups,
          (SELECT COUNT(*) FROM group_members) AS group_members,
          (SELECT COUNT(*) FROM orders) AS orders,
          (SELECT COUNT(*) FROM order_items) AS order_items,
          (SELECT COUNT(*) FROM conversations) AS conversations,
          (SELECT COUNT(*) FROM conversation_participants) AS conversation_participants,
          (SELECT COUNT(*) FROM messages) AS messages,
          (SELECT COUNT(*) FROM escrow_transactions) AS escrow_transactions,
          (SELECT COUNT(*) FROM disputes) AS disputes,
          (SELECT COUNT(*) FROM trust_scores) AS trust_scores
      `);

      const row = tableCounts.rows[0];
      const nonZeroTables = Object.entries(row).filter(([_, count]) => parseInt(count, 10) > 0);
      
      expect(nonZeroTables.length).toBeGreaterThanOrEqual(13);
      for (const [table, count] of nonZeroTables) {
        expect(parseInt(count, 10)).toBeGreaterThan(0);
      }
    });

    test('FK query for order_items sensitivity: accurately catches orphaned foreign keys', async () => {
      const simulatedRes = await pool.query(`
        WITH simulated_order_items AS (
          SELECT gen_random_uuid() AS id, '00000000-0000-0000-0000-000000000001'::uuid AS order_id, (SELECT id FROM products LIMIT 1) AS product_id
          UNION ALL
          SELECT oi.id, oi.order_id, oi.product_id FROM order_items oi LIMIT 1
        )
        SELECT soi.id, soi.order_id, soi.product_id 
        FROM simulated_order_items soi
        LEFT JOIN orders o ON soi.order_id = o.id 
        LEFT JOIN products p ON soi.product_id = p.id 
        WHERE o.id IS NULL OR p.id IS NULL
      `);
      expect(simulatedRes.rows).toHaveLength(1);
      expect(simulatedRes.rows[0].order_id).toBe('00000000-0000-0000-0000-000000000001');
    });

    test('dispute_evidence, group_cart_items, and group_cart_allocations queries detect valid populated rows', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Populate group_cart_items & group_cart_allocations
        const prod = await client.query('SELECT id FROM products LIMIT 1');
        const pId = prod.rows[0].id;

        const gciRes = await client.query(`
          INSERT INTO group_cart_items (group_id, product_id, quantity)
          VALUES ($1, $2, 3)
          RETURNING id
        `, [testGroupId, pId]);
        const gciId = gciRes.rows[0].id;

        await client.query(`
          INSERT INTO group_cart_allocations (cart_item_id, user_id, quantity)
          VALUES ($1, $2, 3)
        `, [gciId, memberUserId]);

        // Populate dispute_evidence with valid check constraint: 'photo'
        const disp = await client.query('SELECT id FROM disputes LIMIT 1');
        const dispId = disp.rows[0].id;

        await client.query(`
          INSERT INTO dispute_evidence (dispute_id, uploaded_by, type, url, description)
          VALUES ($1, 'buyer', 'photo', 'https://example.com/evidence.jpg', 'Damaged package')
        `, [dispId]);

        // Run the exact 3 queries from seed.integrity.test.js with non-empty tables
        const gciCheck = await client.query(`
          SELECT gci.id, gci.group_id, gci.product_id 
          FROM group_cart_items gci 
          LEFT JOIN groups g ON gci.group_id = g.id 
          LEFT JOIN products p ON gci.product_id = p.id 
          WHERE g.id IS NULL OR p.id IS NULL
        `);
        expect(gciCheck.rows).toHaveLength(0);

        const gcaCheck = await client.query(`
          SELECT gca.id, gca.cart_item_id, gca.user_id 
          FROM group_cart_allocations gca 
          LEFT JOIN group_cart_items gci ON gca.cart_item_id = gci.id 
          LEFT JOIN users u ON gca.user_id = u.id 
          WHERE gci.id IS NULL OR u.id IS NULL
        `);
        expect(gcaCheck.rows).toHaveLength(0);

        const deCheck = await client.query(`
          SELECT de.id, de.dispute_id 
          FROM dispute_evidence de 
          LEFT JOIN disputes d ON de.dispute_id = d.id 
          WHERE d.id IS NULL
        `);
        expect(deCheck.rows).toHaveLength(0);
      } finally {
        await client.query('ROLLBACK');
        client.release();
      }
    });
  });
});
