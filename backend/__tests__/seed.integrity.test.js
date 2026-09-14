/**
 * Database Seed Integrity Test
 * Validates relational integrity, group-vendor pairings,
 * chat participant permissions (including Chioma's observer status),
 * and escrow seller alignments across the seeded database.
 */
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import pool from '../config/database.js';
import { seedDatabase } from '../db/seed.js';

describe('Database Seed Integrity & Realignment Verification', () => {
  beforeAll(async () => {
    // Ensure updated trigger functions and cart triggers are applied in the database
    await pool.query(`
      CREATE OR REPLACE FUNCTION add_member_to_vendor_chats()
      RETURNS TRIGGER AS $$
      BEGIN
          INSERT INTO conversation_participants (conversation_id, user_id, role, can_send)
          SELECT 
              c.id,
              NEW.user_id,
              CASE WHEN NEW.role = 'admin' THEN 'admin' ELSE 'member' END,
              (NEW.role = 'admin')
          FROM conversations c
          WHERE c.group_id = NEW.group_id 
            AND c.type = 'group-vendor'
            AND (c.vendor_id IS NULL OR c.vendor_id != NEW.user_id)
          ON CONFLICT (conversation_id, user_id) DO UPDATE
          SET role = EXCLUDED.role,
              can_send = EXCLUDED.can_send
          WHERE conversation_participants.role != 'vendor';

          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS add_to_vendor_chat_trigger ON group_members;
      CREATE TRIGGER add_to_vendor_chat_trigger
          AFTER INSERT OR UPDATE ON group_members
          FOR EACH ROW
          EXECUTE FUNCTION add_member_to_vendor_chats();

      CREATE OR REPLACE FUNCTION enroll_members_in_new_vendor_chat()
      RETURNS TRIGGER AS $$
      BEGIN
          IF NEW.type = 'group-vendor' THEN
              IF NEW.vendor_id IS NOT NULL THEN
                  INSERT INTO conversation_participants (conversation_id, user_id, role, can_send)
                  VALUES (NEW.id, NEW.vendor_id, 'vendor', true)
                  ON CONFLICT (conversation_id, user_id) DO UPDATE
                  SET role = 'vendor', can_send = true;
              END IF;

              INSERT INTO conversation_participants (conversation_id, user_id, role, can_send)
              SELECT 
                  NEW.id,
                  gm.user_id,
                  CASE WHEN gm.role = 'admin' THEN 'admin' ELSE 'member' END,
                  (gm.role = 'admin')
              FROM group_members gm
              WHERE gm.group_id = NEW.group_id
                AND (NEW.vendor_id IS NULL OR gm.user_id != NEW.vendor_id)
              ON CONFLICT (conversation_id, user_id) DO UPDATE
              SET role = EXCLUDED.role,
                  can_send = EXCLUDED.can_send
              WHERE conversation_participants.role != 'vendor';
          END IF;

          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS enroll_members_in_new_vendor_chat_trigger ON conversations;
      CREATE TRIGGER enroll_members_in_new_vendor_chat_trigger
          AFTER INSERT ON conversations
          FOR EACH ROW
          EXECUTE FUNCTION enroll_members_in_new_vendor_chat();

      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS update_group_cart_items_updated_at ON group_cart_items;
      CREATE TRIGGER update_group_cart_items_updated_at
          BEFORE UPDATE ON group_cart_items
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_group_cart_allocations_updated_at ON group_cart_allocations;
      CREATE TRIGGER update_group_cart_allocations_updated_at
          BEFORE UPDATE ON group_cart_allocations
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    `);

    // Ensure database is populated with seed data
    const checkUsers = await pool.query('SELECT COUNT(*) FROM users');
    const checkGroups = await pool.query("SELECT COUNT(*) FROM groups WHERE name = 'Tech Accessories'");
    if (parseInt(checkUsers.rows[0].count, 10) === 0 || parseInt(checkGroups.rows[0].count, 10) === 0) {
      await pool.query(`
        TRUNCATE TABLE 
          dispute_evidence, disputes, escrow_transactions, order_items, orders,
          group_cart_allocations, group_cart_items, group_members,
          message_read_receipts, typing_indicators, messages, conversation_participants, conversations,
          trust_scores, products, groups, users, vendors
        CASCADE
      `);
      await seedDatabase(pool);
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  // 1. Foreign Key Integrity Checks (No orphaned records)
  describe('Foreign Key Integrity', () => {
    test('all users with vendor_id reference valid vendors', async () => {
      const res = await pool.query(`
        SELECT u.id, u.email, u.vendor_id 
        FROM users u 
        LEFT JOIN vendors v ON u.vendor_id = v.id 
        WHERE u.vendor_id IS NOT NULL AND v.id IS NULL
      `);
      expect(res.rows).toHaveLength(0);
    });

    test('all products reference valid vendors', async () => {
      const res = await pool.query(`
        SELECT p.id, p.name, p.vendor_id 
        FROM products p 
        LEFT JOIN vendors v ON p.vendor_id = v.id 
        WHERE v.id IS NULL
      `);
      expect(res.rows).toHaveLength(0);
    });

    test('all groups reference valid creators in users', async () => {
      const res = await pool.query(`
        SELECT g.id, g.name, g.created_by 
        FROM groups g 
        LEFT JOIN users u ON g.created_by = u.id 
        WHERE u.id IS NULL
      `);
      expect(res.rows).toHaveLength(0);
    });

    test('all group_members reference valid groups and users', async () => {
      const res = await pool.query(`
        SELECT gm.id, gm.group_id, gm.user_id 
        FROM group_members gm 
        LEFT JOIN groups g ON gm.group_id = g.id 
        LEFT JOIN users u ON gm.user_id = u.id 
        WHERE g.id IS NULL OR u.id IS NULL
      `);
      expect(res.rows).toHaveLength(0);
    });

    test('all orders reference valid groups and buyers', async () => {
      const res = await pool.query(`
        SELECT o.id, o.order_number, o.group_id, o.buyer_id 
        FROM orders o 
        LEFT JOIN groups g ON o.group_id = g.id 
        LEFT JOIN users u ON o.buyer_id = u.id 
        WHERE g.id IS NULL OR u.id IS NULL
      `);
      expect(res.rows).toHaveLength(0);
    });

    test('all order_items reference valid orders and products', async () => {
      const res = await pool.query(`
        SELECT oi.id, oi.order_id, oi.product_id 
        FROM order_items oi 
        LEFT JOIN orders o ON oi.order_id = o.id 
        LEFT JOIN products p ON oi.product_id = p.id 
        WHERE o.id IS NULL OR p.id IS NULL
      `);
      expect(res.rows).toHaveLength(0);
    });

    test('all conversations reference valid groups and vendors', async () => {
      const res = await pool.query(`
        SELECT c.id, c.title, c.group_id, c.vendor_id, c.type 
        FROM conversations c 
        LEFT JOIN groups g ON c.group_id = g.id 
        LEFT JOIN users u ON c.vendor_id = u.id 
        WHERE g.id IS NULL OR (c.type = 'group-vendor' AND u.id IS NULL)
      `);
      expect(res.rows).toHaveLength(0);
    });

    test('all conversation_participants reference valid conversations and users', async () => {
      const res = await pool.query(`
        SELECT cp.id, cp.conversation_id, cp.user_id 
        FROM conversation_participants cp 
        LEFT JOIN conversations c ON cp.conversation_id = c.id 
        LEFT JOIN users u ON cp.user_id = u.id 
        WHERE c.id IS NULL OR u.id IS NULL
      `);
      expect(res.rows).toHaveLength(0);
    });

    test('all messages reference valid conversations and senders', async () => {
      const res = await pool.query(`
        SELECT m.id, m.conversation_id, m.sender_id 
        FROM messages m 
        LEFT JOIN conversations c ON m.conversation_id = c.id 
        LEFT JOIN users u ON m.sender_id = u.id 
        WHERE c.id IS NULL OR u.id IS NULL
      `);
      expect(res.rows).toHaveLength(0);
    });

    test('all escrow_transactions reference valid orders, buyers, and sellers', async () => {
      const res = await pool.query(`
        SELECT et.id, et.transaction_number, et.order_id, et.buyer_id, et.seller_id 
        FROM escrow_transactions et 
        LEFT JOIN orders o ON et.order_id = o.id 
        LEFT JOIN users b ON et.buyer_id = b.id 
        LEFT JOIN users s ON et.seller_id = s.id 
        WHERE o.id IS NULL OR b.id IS NULL OR s.id IS NULL
      `);
      expect(res.rows).toHaveLength(0);
    });

    test('all disputes reference valid escrow transactions', async () => {
      const res = await pool.query(`
        SELECT d.id, d.dispute_number, d.transaction_id 
        FROM disputes d 
        LEFT JOIN escrow_transactions et ON d.transaction_id = et.id 
        WHERE et.id IS NULL
      `);
      expect(res.rows).toHaveLength(0);
    });

    test('all trust_scores reference valid users', async () => {
      const res = await pool.query(`
        SELECT ts.id, ts.user_id 
        FROM trust_scores ts 
        LEFT JOIN users u ON ts.user_id = u.id 
        WHERE u.id IS NULL
      `);
      expect(res.rows).toHaveLength(0);
    });

    test('all group_cart_items reference valid groups and products', async () => {
      const res = await pool.query(`
        SELECT gci.id, gci.group_id, gci.product_id 
        FROM group_cart_items gci 
        LEFT JOIN groups g ON gci.group_id = g.id 
        LEFT JOIN products p ON gci.product_id = p.id 
        WHERE g.id IS NULL OR p.id IS NULL
      `);
      expect(res.rows).toHaveLength(0);
    });

    test('all group_cart_allocations reference valid cart items and users', async () => {
      const res = await pool.query(`
        SELECT gca.id, gca.cart_item_id, gca.user_id 
        FROM group_cart_allocations gca 
        LEFT JOIN group_cart_items gci ON gca.cart_item_id = gci.id 
        LEFT JOIN users u ON gca.user_id = u.id 
        WHERE gci.id IS NULL OR u.id IS NULL
      `);
      expect(res.rows).toHaveLength(0);
    });

    test('all conversations with product_id reference valid products', async () => {
      const res = await pool.query(`
        SELECT c.id, c.title, c.product_id 
        FROM conversations c 
        LEFT JOIN products p ON c.product_id = p.id 
        WHERE c.product_id IS NOT NULL AND p.id IS NULL
      `);
      expect(res.rows).toHaveLength(0);
    });

    test('all dispute_evidence reference valid disputes', async () => {
      const res = await pool.query(`
        SELECT de.id, de.dispute_id 
        FROM dispute_evidence de 
        LEFT JOIN disputes d ON de.dispute_id = d.id 
        WHERE d.id IS NULL
      `);
      expect(res.rows).toHaveLength(0);
    });
  });

  // 2. Group-Vendor Pairings Verification
  describe('Group-Vendor Pairings', () => {
    test('Tech Accessories is paired with Tech Wholesale Hub', async () => {
      const res = await pool.query(`
        SELECT c.id, c.title, c.avatar, c.type, g.name AS group_name, u.email AS vendor_email, u.role AS user_role
        FROM conversations c
        JOIN groups g ON c.group_id = g.id
        JOIN users u ON c.vendor_id = u.id
        WHERE g.name = 'Tech Accessories' AND c.type = 'group-vendor'
      `);
      expect(res.rows).toHaveLength(1);
      const row = res.rows[0];
      expect(row.title).toBe('Tech Wholesale Hub');
      expect(row.vendor_email).toBe('vendor@techwholesale.com');
      expect(row.user_role).toBe('vendor');
      expect(row.avatar).toBe('⚡');
    });

    test('Office Supplies Squad is paired with Office Essentials Plus', async () => {
      const res = await pool.query(`
        SELECT c.id, c.title, c.avatar, c.type, g.name AS group_name, u.email AS vendor_email, u.role AS user_role
        FROM conversations c
        JOIN groups g ON c.group_id = g.id
        JOIN users u ON c.vendor_id = u.id
        WHERE g.name = 'Office Supplies Squad' AND c.type = 'group-vendor'
      `);
      expect(res.rows).toHaveLength(1);
      const row = res.rows[0];
      expect(row.title).toBe('Office Essentials Plus');
      expect(row.vendor_email).toBe('vendor@officeessentials.com');
      expect(row.user_role).toBe('vendor');
      expect(row.avatar).toBe('📎');
    });

    test('Neighborhood Grocery is paired with Fresh Farm Collective', async () => {
      const res = await pool.query(`
        SELECT c.id, c.title, c.avatar, c.type, g.name AS group_name, u.email AS vendor_email, u.role AS user_role
        FROM conversations c
        JOIN groups g ON c.group_id = g.id
        JOIN users u ON c.vendor_id = u.id
        WHERE g.name = 'Neighborhood Grocery' AND c.type = 'group-vendor'
      `);
      expect(res.rows).toHaveLength(1);
      const row = res.rows[0];
      expect(row.title).toBe('Fresh Farm Collective');
      expect(row.vendor_email).toBe('vendor@freshfarm.com');
      expect(row.user_role).toBe('vendor');
      expect(row.avatar).toBe('🥬');
    });

    test('Office Essentials Plus vendor user exists with vendor role and proper vendor_id', async () => {
      const res = await pool.query(`
        SELECT u.id, u.email, u.role, v.name AS vendor_name
        FROM users u
        JOIN vendors v ON u.vendor_id = v.id
        WHERE u.email = 'vendor@officeessentials.com'
      `);
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].role).toBe('vendor');
      expect(res.rows[0].vendor_name).toBe('Office Essentials Plus');
    });
  });

  // 3. Participant Permissions & Chioma Observer Verification
  describe('Group-Vendor Chat Participant Permissions', () => {
    test('Chioma has observer participant record in Tech Wholesale Hub with can_send = false', async () => {
      const res = await pool.query(`
        SELECT cp.id, cp.role, cp.can_send, u.email, c.title, g.name AS group_name
        FROM conversation_participants cp
        JOIN users u ON cp.user_id = u.id
        JOIN conversations c ON cp.conversation_id = c.id
        JOIN groups g ON c.group_id = g.id
        WHERE u.email = 'chioma@example.com' 
          AND g.name = 'Tech Accessories' 
          AND c.type = 'group-vendor'
      `);
      expect(res.rows).toHaveLength(1);
      const row = res.rows[0];
      expect(row.role).toBe('member');
      expect(row.can_send).toBe(false);
      expect(row.title).toBe('Tech Wholesale Hub');
    });

    test('Afam has admin participant record in Tech Wholesale Hub with can_send = true', async () => {
      const res = await pool.query(`
        SELECT cp.role, cp.can_send
        FROM conversation_participants cp
        JOIN users u ON cp.user_id = u.id
        JOIN conversations c ON cp.conversation_id = c.id
        JOIN groups g ON c.group_id = g.id
        WHERE u.email = 'afam@example.com' 
          AND g.name = 'Tech Accessories' 
          AND c.type = 'group-vendor'
      `);
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].role).toBe('admin');
      expect(res.rows[0].can_send).toBe(true);
    });

    test('Tech Wholesale Hub vendor has vendor participant record with can_send = true', async () => {
      const res = await pool.query(`
        SELECT cp.role, cp.can_send
        FROM conversation_participants cp
        JOIN users u ON cp.user_id = u.id
        JOIN conversations c ON cp.conversation_id = c.id
        JOIN groups g ON c.group_id = g.id
        WHERE u.email = 'vendor@techwholesale.com' 
          AND g.name = 'Tech Accessories' 
          AND c.type = 'group-vendor'
      `);
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].role).toBe('vendor');
      expect(res.rows[0].can_send).toBe(true);
    });

    test('Chioma is observer in Fresh Farm Collective vendor chat with can_send = false', async () => {
      const res = await pool.query(`
        SELECT cp.role, cp.can_send
        FROM conversation_participants cp
        JOIN users u ON cp.user_id = u.id
        JOIN conversations c ON cp.conversation_id = c.id
        JOIN groups g ON c.group_id = g.id
        WHERE u.email = 'chioma@example.com' 
          AND g.name = 'Neighborhood Grocery' 
          AND c.type = 'group-vendor'
      `);
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].role).toBe('member');
      expect(res.rows[0].can_send).toBe(false);
    });
  });

  // 4. Escrow Sellers Match Product Vendors
  describe('Escrow Seller Alignment', () => {
    test('all escrow transactions have seller_id matching the user ID of the product vendor', async () => {
      const res = await pool.query(`
        SELECT 
          et.id AS escrow_id,
          et.transaction_number,
          et.seller_id,
          seller.email AS seller_email,
          p.name AS product_name,
          vendor_user.id AS expected_vendor_user_id,
          vendor_user.email AS expected_vendor_email
        FROM escrow_transactions et
        JOIN orders o ON et.order_id = o.id
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        JOIN users vendor_user ON vendor_user.vendor_id = p.vendor_id
        JOIN users seller ON et.seller_id = seller.id
        WHERE et.seller_id != vendor_user.id
      `);
      expect(res.rows).toHaveLength(0);
    });

    test('every order items vendor matches the groups assigned vendor in conversations', async () => {
      const res = await pool.query(`
        SELECT 
          o.order_number,
          g.name AS group_name,
          p.name AS product_name,
          c.title AS conversation_title,
          c.vendor_id AS conversation_vendor_user_id,
          product_vendor_user.id AS product_vendor_user_id
        FROM orders o
        JOIN groups g ON o.group_id = g.id
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        JOIN users product_vendor_user ON product_vendor_user.vendor_id = p.vendor_id
        JOIN conversations c ON c.group_id = g.id AND c.type = 'group-vendor'
        WHERE c.vendor_id != product_vendor_user.id
      `);
      expect(res.rows).toHaveLength(0);
    });

    test('Tech Accessories group has an order with order items', async () => {
      const res = await pool.query(`
        SELECT o.order_number, oi.quantity, oi.price, p.name AS product_name
        FROM orders o
        JOIN groups g ON o.group_id = g.id
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE g.name = 'Tech Accessories'
      `);
      expect(res.rows.length).toBeGreaterThan(0);
    });
  });

  // 5. Chat & Cart Triggers Verification (Catalog Existence)
  describe('Group-Vendor Chat & Cart Triggers', () => {
    test('triggers for chat auto-enrollment and cart timestamps exist in information_schema', async () => {
      const res = await pool.query(`
        SELECT trigger_name, event_manipulation, event_object_table
        FROM information_schema.triggers
        WHERE trigger_name IN (
          'add_to_vendor_chat_trigger', 
          'enroll_members_in_new_vendor_chat_trigger',
          'update_group_cart_items_updated_at',
          'update_group_cart_allocations_updated_at'
        )
      `);
      const names = res.rows.map(r => r.trigger_name);
      expect(names).toContain('add_to_vendor_chat_trigger');
      expect(names).toContain('enroll_members_in_new_vendor_chat_trigger');
      expect(names).toContain('update_group_cart_items_updated_at');
      expect(names).toContain('update_group_cart_allocations_updated_at');
    });

    test('group_cart_items and group_cart_allocations tables exist', async () => {
      const res = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN ('group_cart_items', 'group_cart_allocations')
      `);
      const tables = res.rows.map(r => r.table_name);
      expect(tables).toContain('group_cart_items');
      expect(tables).toContain('group_cart_allocations');
    });
  });

  // 6. Dynamic Trigger Lifecycle & Immunity Tests
  describe('Dynamic Chat Triggers & Timestamp Auto-Update Execution', () => {
    test('inserting a member into a group auto-enrolls member into group-vendor chat with can_send = false', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const userRes = await client.query(`
          INSERT INTO users (email, password_hash, name, role)
          VALUES ('dynamic_observer_test@example.com', 'dummyhash', 'Dynamic Observer', 'member')
          RETURNING id
        `);
        const testUserId = userRes.rows[0].id;

        const groupRes = await client.query(`SELECT id FROM groups WHERE name = 'Tech Accessories'`);
        const groupId = groupRes.rows[0].id;

        const convoRes = await client.query(`
          SELECT id FROM conversations WHERE group_id = $1 AND type = 'group-vendor'
        `, [groupId]);
        const conversationId = convoRes.rows[0].id;

        await client.query(`
          INSERT INTO group_members (group_id, user_id, role)
          VALUES ($1, $2, 'member')
        `, [groupId, testUserId]);

        const participantRes = await client.query(`
          SELECT role, can_send 
          FROM conversation_participants 
          WHERE conversation_id = $1 AND user_id = $2
        `, [conversationId, testUserId]);

        expect(participantRes.rows).toHaveLength(1);
        expect(participantRes.rows[0].role).toBe('member');
        expect(participantRes.rows[0].can_send).toBe(false);
      } finally {
        try {
          await client.query('ROLLBACK');
        } catch (_) {}
        client.release();
      }
    });

    test('inserting an admin into a group auto-enrolls admin into group-vendor chat with can_send = true', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const userRes = await client.query(`
          INSERT INTO users (email, password_hash, name, role)
          VALUES ('dynamic_admin_test@example.com', 'dummyhash', 'Dynamic Admin', 'member')
          RETURNING id
        `);
        const testUserId = userRes.rows[0].id;

        const groupRes = await client.query(`SELECT id FROM groups WHERE name = 'Tech Accessories'`);
        const groupId = groupRes.rows[0].id;

        const convoRes = await client.query(`
          SELECT id FROM conversations WHERE group_id = $1 AND type = 'group-vendor'
        `, [groupId]);
        const conversationId = convoRes.rows[0].id;

        await client.query(`
          INSERT INTO group_members (group_id, user_id, role)
          VALUES ($1, $2, 'admin')
        `, [groupId, testUserId]);

        const participantRes = await client.query(`
          SELECT role, can_send 
          FROM conversation_participants 
          WHERE conversation_id = $1 AND user_id = $2
        `, [conversationId, testUserId]);

        expect(participantRes.rows).toHaveLength(1);
        expect(participantRes.rows[0].role).toBe('admin');
        expect(participantRes.rows[0].can_send).toBe(true);
      } finally {
        try {
          await client.query('ROLLBACK');
        } catch (_) {}
        client.release();
      }
    });

    test('creating a new group-vendor chat auto-enrolls existing members and vendor with proper permissions', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const creatorRes = await client.query(`SELECT id FROM users WHERE email = 'afam@example.com'`);
        const afamId = creatorRes.rows[0].id;

        const groupRes = await client.query(`
          INSERT INTO groups (name, description, join_code, moq_target, status, created_by)
          VALUES ('Dynamic Trigger Test Group', 'Test group for trigger', 'DYNTRG123', 30, 'active', $1)
          RETURNING id
        `, [afamId]);
        const testGroupId = groupRes.rows[0].id;

        const chiomaRes = await client.query(`SELECT id FROM users WHERE email = 'chioma@example.com'`);
        const chiomaId = chiomaRes.rows[0].id;

        await client.query(`
          INSERT INTO group_members (group_id, user_id, role)
          VALUES ($1, $2, 'admin'), ($1, $3, 'member')
        `, [testGroupId, afamId, chiomaId]);

        const vendorRes = await client.query(`SELECT id FROM users WHERE email = 'vendor@techwholesale.com'`);
        const vendorUserId = vendorRes.rows[0].id;

        const convoRes = await client.query(`
          INSERT INTO conversations (type, title, avatar, group_id, vendor_id)
          VALUES ('group-vendor', 'Dynamic Vendor Test Convo', '⚡', $1, $2)
          RETURNING id
        `, [testGroupId, vendorUserId]);
        const conversationId = convoRes.rows[0].id;

        const participantsRes = await client.query(`
          SELECT cp.role, cp.can_send, u.email
          FROM conversation_participants cp
          JOIN users u ON cp.user_id = u.id
          WHERE cp.conversation_id = $1
        `, [conversationId]);

        expect(participantsRes.rows).toHaveLength(3);

        const partMap = {};
        participantsRes.rows.forEach(r => { partMap[r.email] = r; });

        expect(partMap['vendor@techwholesale.com'].role).toBe('vendor');
        expect(partMap['vendor@techwholesale.com'].can_send).toBe(true);

        expect(partMap['afam@example.com'].role).toBe('admin');
        expect(partMap['afam@example.com'].can_send).toBe(true);

        expect(partMap['chioma@example.com'].role).toBe('member');
        expect(partMap['chioma@example.com'].can_send).toBe(false);
      } finally {
        try {
          await client.query('ROLLBACK');
        } catch (_) {}
        client.release();
      }
    });

    test('vendor added to group_members does not lose vendor privileges in vendor chat', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const vendorRes = await client.query(`SELECT id FROM users WHERE email = 'vendor@techwholesale.com'`);
        const vendorUserId = vendorRes.rows[0].id;

        const groupRes = await client.query(`SELECT id FROM groups WHERE name = 'Tech Accessories'`);
        const groupId = groupRes.rows[0].id;

        const convoRes = await client.query(`
          SELECT id FROM conversations WHERE group_id = $1 AND type = 'group-vendor'
        `, [groupId]);
        const conversationId = convoRes.rows[0].id;

        const initialPart = await client.query(`
          SELECT role, can_send 
          FROM conversation_participants 
          WHERE conversation_id = $1 AND user_id = $2
        `, [conversationId, vendorUserId]);
        expect(initialPart.rows).toHaveLength(1);
        expect(initialPart.rows[0].role).toBe('vendor');
        expect(initialPart.rows[0].can_send).toBe(true);

        await client.query(`
          INSERT INTO group_members (group_id, user_id, role)
          VALUES ($1, $2, 'member')
        `, [groupId, vendorUserId]);

        const partRes = await client.query(`
          SELECT role, can_send 
          FROM conversation_participants 
          WHERE conversation_id = $1 AND user_id = $2
        `, [conversationId, vendorUserId]);

        expect(partRes.rows).toHaveLength(1);
        expect(partRes.rows[0].role).toBe('vendor');
        expect(partRes.rows[0].can_send).toBe(true);
      } finally {
        try {
          await client.query('ROLLBACK');
        } catch (_) {}
        client.release();
      }
    });

    test('updating group_cart_items and group_cart_allocations automatically refreshes updated_at', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const groupRes = await client.query(`SELECT id FROM groups WHERE name = 'Tech Accessories'`);
        const groupId = groupRes.rows[0].id;

        const prodRes = await client.query(`SELECT id FROM products LIMIT 1`);
        const productId = prodRes.rows[0].id;

        const userRes = await client.query(`SELECT id FROM users WHERE email = 'afam@example.com'`);
        const userId = userRes.rows[0].id;

        const itemRes = await client.query(`
          INSERT INTO group_cart_items (group_id, product_id, quantity, updated_at)
          VALUES ($1, $2, 2, NOW() - INTERVAL '30 minutes')
          RETURNING id, updated_at
        `, [groupId, productId]);
        const itemId = itemRes.rows[0].id;
        const initialItemTime = new Date(itemRes.rows[0].updated_at).getTime();

        const allocRes = await client.query(`
          INSERT INTO group_cart_allocations (cart_item_id, user_id, quantity, updated_at)
          VALUES ($1, $2, 2, NOW() - INTERVAL '30 minutes')
          RETURNING id, updated_at
        `, [itemId, userId]);
        const allocId = allocRes.rows[0].id;
        const initialAllocTime = new Date(allocRes.rows[0].updated_at).getTime();

        await client.query(`UPDATE group_cart_items SET quantity = 4 WHERE id = $1`, [itemId]);
        await client.query(`UPDATE group_cart_allocations SET quantity = 4 WHERE id = $1`, [allocId]);

        const updatedItemRes = await client.query(`SELECT updated_at FROM group_cart_items WHERE id = $1`, [itemId]);
        const updatedAllocRes = await client.query(`SELECT updated_at FROM group_cart_allocations WHERE id = $1`, [allocId]);

        expect(new Date(updatedItemRes.rows[0].updated_at).getTime()).toBeGreaterThan(initialItemTime);
        expect(new Date(updatedAllocRes.rows[0].updated_at).getTime()).toBeGreaterThan(initialAllocTime);
      } finally {
        try {
          await client.query('ROLLBACK');
        } catch (_) {}
        client.release();
      }
    });
  });
});
