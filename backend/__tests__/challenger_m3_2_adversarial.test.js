/**
 * Challenger 2 Adversarial Test Suite for Milestone 3:
 * Group-Vendor Chat Visibility & Dynamic Member Enrollment
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ClientIO } from 'socket.io-client';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import pool from '../config/database.js';
import chatRoutes from '../routes/chat.routes.js';
import { initializeChatSocket } from '../socket/chat.socket.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'save-together-development-jwt-secret-key-12345';

function generateToken(userId, role = 'member') {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '1h' });
}

describe('Challenger 2: Adversarial Stress Test - Real-Time Visibility & Dynamic Enrollment', () => {
  let app;
  let httpServer;
  let io;
  let serverPort;

  let chiomaUser;
  let afamUser;
  let vendorUser;
  let strangerUser;
  let dynamicMemberUser;
  let dynamicAdminUser;

  let chiomaToken;
  let afamToken;
  let vendorToken;
  let strangerToken;
  let dynamicMemberToken;
  let dynamicAdminToken;

  let techGroup;
  let techConv;

  let chiomaSocket;
  let afamSocket;
  let dynamicMemberSocket;

  beforeAll(async () => {
    // 1. Fetch seed users
    const usersRes = await pool.query(
      `SELECT id, email, name, role FROM users WHERE email IN (
        'chioma@example.com',
        'afam@example.com',
        'vendor@techwholesale.com'
      )`
    );

    chiomaUser = usersRes.rows.find(u => u.email === 'chioma@example.com');
    afamUser = usersRes.rows.find(u => u.email === 'afam@example.com');
    vendorUser = usersRes.rows.find(u => u.email === 'vendor@techwholesale.com');

    expect(chiomaUser).toBeDefined();
    expect(afamUser).toBeDefined();
    expect(vendorUser).toBeDefined();

    // 2. Fetch Tech Accessories group and vendor conversation
    const groupRes = await pool.query(
      `SELECT id, name, join_code FROM groups WHERE name = 'Tech Accessories' LIMIT 1`
    );
    techGroup = groupRes.rows[0];
    expect(techGroup).toBeDefined();

    const convRes = await pool.query(
      `SELECT id, title, type, group_id, vendor_id 
       FROM conversations 
       WHERE group_id = $1 AND type = 'group-vendor' 
       LIMIT 1`,
      [techGroup.id]
    );
    techConv = convRes.rows[0];
    expect(techConv).toBeDefined();

    // 3. Create a stranger user who is NOT in Tech Accessories
    const strangerRes = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, is_active)
       VALUES ($1, '$2a$10$abcdefghijklmnopqrstuvwxyz123456', 'Adversarial Stranger', 'member', true)
       RETURNING id, email, name, role`,
      [`adv_stranger_${Date.now()}@example.com`]
    );
    strangerUser = strangerRes.rows[0];

    // 4. Create dynamic member user (not initially in group)
    const dynMemberRes = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, is_active)
       VALUES ($1, '$2a$10$abcdefghijklmnopqrstuvwxyz123456', 'Dynamic Bob', 'member', true)
       RETURNING id, email, name, role`,
      [`dynamic_bob_${Date.now()}@example.com`]
    );
    dynamicMemberUser = dynMemberRes.rows[0];

    // 5. Create dynamic admin user (not initially in group)
    const dynAdminRes = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, is_active)
       VALUES ($1, '$2a$10$abcdefghijklmnopqrstuvwxyz123456', 'Dynamic Alice Admin', 'member', true)
       RETURNING id, email, name, role`,
      [`dynamic_alice_${Date.now()}@example.com`]
    );
    dynamicAdminUser = dynAdminRes.rows[0];

    // Tokens
    chiomaToken = generateToken(chiomaUser.id, chiomaUser.role);
    afamToken = generateToken(afamUser.id, afamUser.role);
    vendorToken = generateToken(vendorUser.id, vendorUser.role);
    strangerToken = generateToken(strangerUser.id, strangerUser.role);
    dynamicMemberToken = generateToken(dynamicMemberUser.id, dynamicMemberUser.role);
    dynamicAdminToken = generateToken(dynamicAdminUser.id, dynamicAdminUser.role);

    // Express & Socket.IO server setup
    app = express();
    app.use(express.json());
    httpServer = http.createServer(app);

    io = new Server(httpServer, {
      cors: { origin: '*' },
    });
    app.set('io', io);

    app.use('/api/chat', chatRoutes);

    initializeChatSocket(io);

    await new Promise((resolve) => {
      httpServer.listen(0, () => {
        serverPort = httpServer.address().port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (chiomaSocket?.connected) chiomaSocket.disconnect();
    if (afamSocket?.connected) afamSocket.disconnect();
    if (dynamicMemberSocket?.connected) dynamicMemberSocket.disconnect();

    // Clean up created users and group members
    const cleanUserIds = [
      strangerUser?.id,
      dynamicMemberUser?.id,
      dynamicAdminUser?.id,
    ].filter(Boolean);

    if (cleanUserIds.length > 0) {
      await pool.query(`DELETE FROM group_members WHERE user_id = ANY($1::uuid[])`, [cleanUserIds]);
      await pool.query(`DELETE FROM conversation_participants WHERE user_id = ANY($1::uuid[])`, [cleanUserIds]);
      await pool.query(`DELETE FROM messages WHERE sender_id = ANY($1::uuid[])`, [cleanUserIds]);
      await pool.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [cleanUserIds]);
    }

    io.close();
    await new Promise((resolve) => httpServer.close(resolve));
  });

  // -------------------------------------------------------------------------
  // Part 1: Chioma's Visibility and canSend: false
  // -------------------------------------------------------------------------
  describe('Part 1: Chioma Visibility & Permission Invariants', () => {
    test('Chioma sees "Tech Wholesale Hub" for Tech Accessories with canSend === false and role === "member"', async () => {
      const res = await request(app)
        .get('/api/chat/conversations')
        .set('Authorization', `Bearer ${chiomaToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const conv = res.body.data.find(c => c.id === techConv.id);
      expect(conv).toBeDefined();
      expect(conv.title).toBe('Tech Wholesale Hub');
      expect(conv.groupName).toBe('Tech Accessories');
      expect(conv.type).toBe('group-vendor');
      expect(conv.canSend).toBe(false);
      expect(conv.userRole).toBe('member');
    });

    test('Chioma calling GET /api/chat/conversations/:id returns canSend === false', async () => {
      const res = await request(app)
        .get(`/api/chat/conversations/${techConv.id}`)
        .set('Authorization', `Bearer ${chiomaToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.canSend).toBe(false);
      expect(res.body.data.title).toBe('Tech Wholesale Hub');
    });

    test('Chioma attempting POST /api/chat/conversations/:id/messages is rejected with 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/api/chat/conversations/${techConv.id}/messages`)
        .set('Authorization', `Bearer ${chiomaToken}`)
        .send({ content: 'Chioma trying to speak in vendor chat' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('You do not have permission to send messages in this conversation');
    });
  });

  // -------------------------------------------------------------------------
  // Part 2: Real-time Socket.IO Delivery & Duplicate Broadcast Verification
  // -------------------------------------------------------------------------
  describe('Part 2: Real-Time Socket.IO Broadcasts & De-duplication', () => {
    beforeAll(async () => {
      chiomaSocket = ClientIO(`http://localhost:${serverPort}`, {
        auth: { token: chiomaToken },
        transports: ['websocket'],
      });

      afamSocket = ClientIO(`http://localhost:${serverPort}`, {
        auth: { token: afamToken },
        transports: ['websocket'],
      });

      await Promise.all([
        new Promise(r => chiomaSocket.on('connect', r)),
        new Promise(r => afamSocket.on('connect', r)),
      ]);

      await new Promise(r => {
        chiomaSocket.emit('join-conversation', { conversationId: techConv.id });
        chiomaSocket.on('joined-conversation', r);
      });

      await new Promise(r => {
        afamSocket.emit('join-conversation', { conversationId: techConv.id });
        afamSocket.on('joined-conversation', r);
      });
    });

    test('When Afam (admin) sends a message via REST, Chioma receives new-message in real time', async () => {
      const receivedMessages = [];
      const onMessage = (msg) => {
        if (msg.conversationId === techConv.id) {
          receivedMessages.push(msg);
        }
      };
      chiomaSocket.on('new-message', onMessage);

      const testContent = `Afam REST message ${Date.now()}`;
      const res = await request(app)
        .post(`/api/chat/conversations/${techConv.id}/messages`)
        .set('Authorization', `Bearer ${afamToken}`)
        .send({ content: testContent });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      // Wait a short duration to see if 1 or more events arrive
      await new Promise(r => setTimeout(r, 400));
      chiomaSocket.off('new-message', onMessage);

      console.log(`[Adversarial Test] REST message delivery count to Chioma: ${receivedMessages.length}`);
      expect(receivedMessages.length).toBe(1);
      expect(receivedMessages[0].content).toBe(testContent);
      expect(receivedMessages[0].senderId).toBe(afamUser.id);
    });

    test('When Vendor sends a message via REST, Chioma receives new-message in real time', async () => {
      const receivedMessages = [];
      const onMessage = (msg) => {
        if (msg.conversationId === techConv.id) {
          receivedMessages.push(msg);
        }
      };
      chiomaSocket.on('new-message', onMessage);

      const testContent = `Vendor REST message ${Date.now()}`;
      const res = await request(app)
        .post(`/api/chat/conversations/${techConv.id}/messages`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ content: testContent });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      await new Promise(r => setTimeout(r, 400));
      chiomaSocket.off('new-message', onMessage);

      expect(receivedMessages.length).toBeGreaterThanOrEqual(1);
      expect(receivedMessages[0].content).toBe(testContent);
      expect(receivedMessages[0].senderId).toBe(vendorUser.id);
    });

    test('When Afam sends a message via Socket.IO, Chioma receives new-message in real time', async () => {
      const receivedMessages = [];
      const onMessage = (msg) => {
        if (msg.conversationId === techConv.id) {
          receivedMessages.push(msg);
        }
      };
      chiomaSocket.on('new-message', onMessage);

      const testContent = `Afam Socket message ${Date.now()}`;
      afamSocket.emit('send-message', {
        conversationId: techConv.id,
        content: testContent,
      });

      await new Promise(r => setTimeout(r, 400));
      chiomaSocket.off('new-message', onMessage);

      console.log(`[Adversarial Test] Socket.IO message delivery count to Chioma: ${receivedMessages.length}`);
      expect(receivedMessages.length).toBe(1);
      expect(receivedMessages[0].content).toBe(testContent);
      expect(receivedMessages[0].senderId).toBe(afamUser.id);
    });

    test('When Chioma attempts to send via Socket.IO, she receives error event and message is not broadcast', async () => {
      let errorReceived = null;
      let unauthorizedBroadcast = false;

      const onAfamMsg = (msg) => {
        if (msg.content?.includes('Chioma unauthorized socket attempt')) {
          unauthorizedBroadcast = true;
        }
      };
      afamSocket.on('new-message', onAfamMsg);

      const errorPromise = new Promise(resolve => {
        chiomaSocket.once('error', (err) => {
          errorReceived = err;
          resolve(err);
        });
      });

      chiomaSocket.emit('send-message', {
        conversationId: techConv.id,
        content: 'Chioma unauthorized socket attempt',
      });

      await errorPromise;
      await new Promise(r => setTimeout(r, 300));
      afamSocket.off('new-message', onAfamMsg);

      expect(errorReceived).toBeDefined();
      expect(errorReceived.message).toBe('You do not have permission to send messages in this conversation');
      expect(unauthorizedBroadcast).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Part 3: Dynamic Member Enrollment (No manual participant sync required)
  // -------------------------------------------------------------------------
  describe('Part 3: Dynamic Member Enrollment & Immediate Visibility', () => {
    test('Dynamic member Bob has NO visibility before joining the group', async () => {
      const res = await request(app)
        .get('/api/chat/conversations')
        .set('Authorization', `Bearer ${dynamicMemberToken}`);

      expect(res.status).toBe(200);
      const found = res.body.data.find(c => c.id === techConv.id);
      expect(found).toBeUndefined();

      const msgRes = await request(app)
        .get(`/api/chat/conversations/${techConv.id}/messages`)
        .set('Authorization', `Bearer ${dynamicMemberToken}`);

      expect([403, 404]).toContain(msgRes.status);
    });

    test('Bob dynamically joins Tech Accessories in group_members; immediately sees conversation and message history', async () => {
      // Enroll Bob dynamically into group_members
      await pool.query(
        `INSERT INTO group_members (group_id, user_id, role, joined_at)
         VALUES ($1, $2, 'member', NOW())`,
        [techGroup.id, dynamicMemberUser.id]
      );

      // 1. Bob immediately calls GET /api/chat/conversations
      const listRes = await request(app)
        .get('/api/chat/conversations')
        .set('Authorization', `Bearer ${dynamicMemberToken}`);

      expect(listRes.status).toBe(200);
      const bobConv = listRes.body.data.find(c => c.id === techConv.id);
      expect(bobConv).toBeDefined();
      expect(bobConv.title).toBe('Tech Wholesale Hub');
      expect(bobConv.groupName).toBe('Tech Accessories');
      expect(bobConv.type).toBe('group-vendor');
      expect(bobConv.canSend).toBe(false);
      expect(bobConv.userRole).toBe('member');

      // 2. Bob immediately fetches full message history
      const msgRes = await request(app)
        .get(`/api/chat/conversations/${techConv.id}/messages`)
        .set('Authorization', `Bearer ${dynamicMemberToken}`);

      expect(msgRes.status).toBe(200);
      expect(msgRes.body.success).toBe(true);
      expect(Array.isArray(msgRes.body.data)).toBe(true);
      expect(msgRes.body.data.length).toBeGreaterThan(0);

      // 3. Bob is forbidden from sending messages via REST
      const sendRes = await request(app)
        .post(`/api/chat/conversations/${techConv.id}/messages`)
        .set('Authorization', `Bearer ${dynamicMemberToken}`)
        .send({ content: 'Bob should not be able to send' });

      expect(sendRes.status).toBe(403);
      expect(sendRes.body.error).toBe('You do not have permission to send messages in this conversation');
    });

    test('Even if conversation_participants entry is deleted (desynced state), Bob still sees conversation and messages via group_members fallback', async () => {
      // Deliberately delete from conversation_participants to test pure dynamic fallback
      await pool.query(
        `DELETE FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
        [techConv.id, dynamicMemberUser.id]
      );

      // Verify NO entry exists in conversation_participants
      const cpCheck = await pool.query(
        `SELECT * FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
        [techConv.id, dynamicMemberUser.id]
      );
      expect(cpCheck.rows.length).toBe(0);

      // Bob still sees conversation!
      const listRes = await request(app)
        .get('/api/chat/conversations')
        .set('Authorization', `Bearer ${dynamicMemberToken}`);

      expect(listRes.status).toBe(200);
      const bobConv = listRes.body.data.find(c => c.id === techConv.id);
      expect(bobConv).toBeDefined();
      expect(bobConv.title).toBe('Tech Wholesale Hub');
      expect(bobConv.canSend).toBe(false);

      // Bob still fetches messages!
      const msgRes = await request(app)
        .get(`/api/chat/conversations/${techConv.id}/messages`)
        .set('Authorization', `Bearer ${dynamicMemberToken}`);

      expect(msgRes.status).toBe(200);
      expect(msgRes.body.success).toBe(true);
    });

    test('Bob dynamically joins Socket.IO room and receives real-time messages from Afam', async () => {
      dynamicMemberSocket = ClientIO(`http://localhost:${serverPort}`, {
        auth: { token: dynamicMemberToken },
        transports: ['websocket'],
      });

      await new Promise(r => dynamicMemberSocket.on('connect', r));

      const joinRes = await new Promise(r => {
        dynamicMemberSocket.emit('join-conversation', { conversationId: techConv.id });
        dynamicMemberSocket.on('joined-conversation', r);
      });

      expect(joinRes.conversationId).toBe(techConv.id);

      // Listen for message
      const msgPromise = new Promise(resolve => {
        dynamicMemberSocket.once('new-message', resolve);
      });

      const testContent = `Realtime for Bob at ${Date.now()}`;
      await request(app)
        .post(`/api/chat/conversations/${techConv.id}/messages`)
        .set('Authorization', `Bearer ${afamToken}`)
        .send({ content: testContent });

      const receivedMsg = await msgPromise;
      expect(receivedMsg).toBeDefined();
      expect(receivedMsg.content).toBe(testContent);
    });

    test('Dynamic admin Alice receives canSend === true and can send messages', async () => {
      // Add Alice as 'admin' in group_members
      await pool.query(
        `INSERT INTO group_members (group_id, user_id, role, joined_at)
         VALUES ($1, $2, 'admin', NOW())`,
        [techGroup.id, dynamicAdminUser.id]
      );

      // Check GET /api/chat/conversations
      const listRes = await request(app)
        .get('/api/chat/conversations')
        .set('Authorization', `Bearer ${dynamicAdminToken}`);

      expect(listRes.status).toBe(200);
      const aliceConv = listRes.body.data.find(c => c.id === techConv.id);
      expect(aliceConv).toBeDefined();
      expect(aliceConv.canSend).toBe(true);

      // Alice can send message via REST
      const testContent = `Alice dynamic admin message ${Date.now()}`;
      const sendRes = await request(app)
        .post(`/api/chat/conversations/${techConv.id}/messages`)
        .set('Authorization', `Bearer ${dynamicAdminToken}`)
        .send({ content: testContent });

      expect(sendRes.status).toBe(201);
      expect(sendRes.body.success).toBe(true);
      expect(sendRes.body.data.content).toBe(testContent);
    });

    test('When Bob leaves the group (via removeGroupMember cleanup), access is immediately revoked', async () => {
      // Remove Bob from group_members and conversation_participants (standard removal)
      await pool.query(
        `DELETE FROM group_members WHERE group_id = $1 AND user_id = $2`,
        [techGroup.id, dynamicMemberUser.id]
      );
      await pool.query(
        `DELETE FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
        [techConv.id, dynamicMemberUser.id]
      );

      // Bob can no longer see conversation
      const listRes = await request(app)
        .get('/api/chat/conversations')
        .set('Authorization', `Bearer ${dynamicMemberToken}`);

      expect(listRes.status).toBe(200);
      const bobConv = listRes.body.data.find(c => c.id === techConv.id);
      expect(bobConv).toBeUndefined();

      // Bob can no longer fetch messages
      const msgRes = await request(app)
        .get(`/api/chat/conversations/${techConv.id}/messages`)
        .set('Authorization', `Bearer ${dynamicMemberToken}`);

      expect([403, 404]).toContain(msgRes.status);
    });

    test('Stranger user has no access to conversations, messages, or socket join', async () => {
      const listRes = await request(app)
        .get('/api/chat/conversations')
        .set('Authorization', `Bearer ${strangerToken}`);

      expect(listRes.status).toBe(200);
      const strangerConv = listRes.body.data.find(c => c.id === techConv.id);
      expect(strangerConv).toBeUndefined();

      const msgRes = await request(app)
        .get(`/api/chat/conversations/${techConv.id}/messages`)
        .set('Authorization', `Bearer ${strangerToken}`);

      expect([403, 404]).toContain(msgRes.status);

      // Socket join rejection
      const strangerSocket = ClientIO(`http://localhost:${serverPort}`, {
        auth: { token: strangerToken },
        transports: ['websocket'],
      });

      await new Promise(r => strangerSocket.on('connect', r));

      const errPromise = new Promise(resolve => {
        strangerSocket.once('error', resolve);
      });

      strangerSocket.emit('join-conversation', { conversationId: techConv.id });
      const err = await errPromise;
      expect(err).toBeDefined();
      expect(err.message).toBe('Access denied to this conversation');

      strangerSocket.disconnect();
    });
  });
});
