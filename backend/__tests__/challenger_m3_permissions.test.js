/**
 * Challenger 1: Milestone 3 Permissions & Access Controls Adversarial Test Suite
 *
 * Adversarially challenges:
 * 1. Regular group member (Chioma) bypass attempts (REST, body tampering, Socket.IO, unauthorized delete)
 * 2. Group A Admin attacking Group B's vendor chat (Ngozi attacking Tech Accessories; Afam cross-group member downgrade)
 * 3. Vendor A attacking Vendor B's vendor chat (Fresh Farm vendor attacking Tech chat; SolarTech attacking Tech chat)
 * 4. Unauthenticated user and unrelated stranger access controls (REST 401/403/404, Socket.IO handshake rejection, room isolation)
 * 5. Edge cases: Empty message, oversized payload (>5000 chars), DB integrity assertion
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

function generateToken(userId, role = 'member', expiresIn = '1h') {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn });
}

describe('Challenger 1: Milestone 3 Permissions & Access Controls Adversarial Suite', () => {
  let app;
  let httpServer;
  let io;
  let serverPort;

  // Users
  let chiomaUser;
  let afamUser;
  let ngoziUser;
  let techVendorUser;
  let freshVendorUser;
  let solarVendorUser;
  let strangerUser;

  // Tokens
  let chiomaToken;
  let afamToken;
  let ngoziToken;
  let techVendorToken;
  let freshVendorToken;
  let solarVendorToken;
  let strangerToken;

  // Conversations
  let techVendorConv;
  let groceryVendorConv;

  // Sockets
  let chiomaSocket;
  let strangerSocket;
  let ngoziSocket;
  let freshVendorSocket;

  beforeAll(async () => {
    // 1. Fetch seed users
    const usersRes = await pool.query(
      `SELECT id, email, name, role FROM users WHERE email IN (
        'chioma@example.com',
        'afam@example.com',
        'ngozi@example.com',
        'vendor@techwholesale.com',
        'vendor@freshfarm.com',
        'vendor@solartech.com'
      )`
    );

    chiomaUser = usersRes.rows.find(u => u.email === 'chioma@example.com');
    afamUser = usersRes.rows.find(u => u.email === 'afam@example.com');
    ngoziUser = usersRes.rows.find(u => u.email === 'ngozi@example.com');
    techVendorUser = usersRes.rows.find(u => u.email === 'vendor@techwholesale.com');
    freshVendorUser = usersRes.rows.find(u => u.email === 'vendor@freshfarm.com');
    solarVendorUser = usersRes.rows.find(u => u.email === 'vendor@solartech.com');

    expect(chiomaUser).toBeDefined();
    expect(afamUser).toBeDefined();
    expect(ngoziUser).toBeDefined();
    expect(techVendorUser).toBeDefined();
    expect(freshVendorUser).toBeDefined();
    expect(solarVendorUser).toBeDefined();

    // 2. Fetch or create stranger user
    let strangerRes = await pool.query(
      `SELECT id, email, name, role FROM users WHERE email = 'challenger_stranger@example.com'`
    );
    if (strangerRes.rows.length === 0) {
      const createRes = await pool.query(
        `INSERT INTO users (email, password_hash, name, role, is_active)
         VALUES ('challenger_stranger@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyz123456', 'Challenger Stranger', 'member', true)
         RETURNING id, email, name, role`
      );
      strangerUser = createRes.rows[0];
    } else {
      strangerUser = strangerRes.rows[0];
    }

    // 3. Fetch conversations
    const convRes = await pool.query(
      `SELECT c.id, c.title, c.type, c.group_id, c.vendor_id, g.name as group_name
       FROM conversations c
       JOIN groups g ON c.group_id = g.id
       WHERE c.type = 'group-vendor'`
    );

    techVendorConv = convRes.rows.find(c => c.title === 'Tech Wholesale Hub');
    groceryVendorConv = convRes.rows.find(c => c.title === 'Fresh Farm Collective');

    expect(techVendorConv).toBeDefined();
    expect(groceryVendorConv).toBeDefined();

    // Ensure stranger is NOT in any group or conversation
    await pool.query('DELETE FROM group_members WHERE user_id = $1', [strangerUser.id]);
    await pool.query('DELETE FROM conversation_participants WHERE user_id = $1', [strangerUser.id]);

    // 4. Generate JWT tokens
    chiomaToken = generateToken(chiomaUser.id, chiomaUser.role);
    afamToken = generateToken(afamUser.id, afamUser.role);
    ngoziToken = generateToken(ngoziUser.id, ngoziUser.role);
    techVendorToken = generateToken(techVendorUser.id, techVendorUser.role);
    freshVendorToken = generateToken(freshVendorUser.id, freshVendorUser.role);
    solarVendorToken = generateToken(solarVendorUser.id, solarVendorUser.role);
    strangerToken = generateToken(strangerUser.id, strangerUser.role);

    // 5. Setup Express app & Socket.IO server
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
    if (strangerSocket?.connected) strangerSocket.disconnect();
    if (ngoziSocket?.connected) ngoziSocket.disconnect();
    if (freshVendorSocket?.connected) freshVendorSocket.disconnect();

    if (strangerUser) {
      await pool.query('DELETE FROM conversation_participants WHERE user_id = $1', [strangerUser.id]);
      await pool.query('DELETE FROM users WHERE id = $1', [strangerUser.id]);
    }

    io.close();
    await new Promise((resolve) => httpServer.close(resolve));
  });

  // =========================================================================
  // CHALLENGE 1: Regular Group Member (Chioma) Send Restriction Bypass
  // =========================================================================
  describe('Challenge 1: Regular group member (Chioma) send restriction bypass', () => {
    test('1.1 Chioma direct REST POST -> 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/api/chat/conversations/${techVendorConv.id}/messages`)
        .set('Authorization', `Bearer ${chiomaToken}`)
        .send({ content: 'Adversarial attempt by Chioma to send message' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('You do not have permission to send messages in this conversation');
    });

    test('1.2 Chioma body tampering attack (canSend: true, role: admin) -> 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/api/chat/conversations/${techVendorConv.id}/messages`)
        .set('Authorization', `Bearer ${chiomaToken}`)
        .send({
          content: 'Tampered body trying to elevate privilege',
          canSend: true,
          role: 'admin',
          groupRole: 'admin',
          userRole: 'admin',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('You do not have permission to send messages in this conversation');
    });

    test('1.3 Chioma Socket.IO send-message -> rejected with permission error event', async () => {
      chiomaSocket = ClientIO(`http://localhost:${serverPort}`, {
        auth: { token: chiomaToken },
        transports: ['websocket'],
      });

      await new Promise((resolve, reject) => {
        chiomaSocket.on('connect', resolve);
        chiomaSocket.on('connect_error', reject);
      });

      const errorResult = await new Promise((resolve) => {
        chiomaSocket.once('error', resolve);
        chiomaSocket.emit('send-message', {
          conversationId: techVendorConv.id,
          content: 'Chioma socket send attempt',
        });
      });

      expect(errorResult).toBeDefined();
      expect(errorResult.message).toBe('You do not have permission to send messages in this conversation');
    });

    test('1.4 Chioma Socket.IO payload spoofing (canSend: true, role: admin) -> rejected with error event', async () => {
      const errorResult = await new Promise((resolve) => {
        chiomaSocket.once('error', resolve);
        chiomaSocket.emit('send-message', {
          conversationId: techVendorConv.id,
          content: 'Chioma socket spoof attempt',
          canSend: true,
          role: 'admin',
        });
      });

      expect(errorResult).toBeDefined();
      expect(errorResult.message).toBe('You do not have permission to send messages in this conversation');
    });

    test('1.5 Unauthorized deletion: Chioma cannot delete admin or vendor messages via REST', async () => {
      // Send message as Afam (admin)
      const adminMsgRes = await request(app)
        .post(`/api/chat/conversations/${techVendorConv.id}/messages`)
        .set('Authorization', `Bearer ${afamToken}`)
        .send({ content: 'Legitimate admin message from Afam' });

      expect(adminMsgRes.status).toBe(201);
      const adminMsgId = adminMsgRes.body.data.id;

      // Chioma attempts to delete Afam's message
      const deleteRes = await request(app)
        .delete(`/api/chat/messages/${adminMsgId}`)
        .set('Authorization', `Bearer ${chiomaToken}`);

      expect(deleteRes.status).toBe(403);
      expect(deleteRes.body.success).toBe(false);
      expect(deleteRes.body.error).toMatch(/permission/i);

      // Verify message is NOT marked deleted in database
      const msgDb = await pool.query('SELECT is_deleted FROM messages WHERE id = $1', [adminMsgId]);
      expect(msgDb.rows[0].is_deleted).toBe(false);
    });

    test('1.6 Unauthorized deletion via Socket.IO: Chioma cannot delete admin messages', async () => {
      // Find Afam message
      const msgRes = await pool.query(
        'SELECT id FROM messages WHERE conversation_id = $1 AND sender_id = $2 LIMIT 1',
        [techVendorConv.id, afamUser.id]
      );
      const targetMsgId = msgRes.rows[0].id;

      const deleteError = await new Promise((resolve) => {
        chiomaSocket.once('error', resolve);
        chiomaSocket.emit('delete-message', { messageId: targetMsgId });
      });

      expect(deleteError).toBeDefined();
      expect(deleteError.message).toContain('permission denied');
    });
  });

  // =========================================================================
  // CHALLENGE 2: Group A Admin Attacking Group B's Vendor Chat
  // =========================================================================
  describe("Challenge 2: Group A Admin attacking Group B's vendor chat", () => {
    test("2.1 Ngozi (admin of Neighborhood Grocery, not in Tech Accessories) attempts REST POST to Tech Accessories chat -> 403 Forbidden", async () => {
      const res = await request(app)
        .post(`/api/chat/conversations/${techVendorConv.id}/messages`)
        .set('Authorization', `Bearer ${ngoziToken}`)
        .send({ content: "Ngozi trying to send in Tech Accessories" });

      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    test("2.2 Ngozi attempts REST GET messages of Tech Accessories chat -> 403 Forbidden", async () => {
      const res = await request(app)
        .get(`/api/chat/conversations/${techVendorConv.id}/messages`)
        .set('Authorization', `Bearer ${ngoziToken}`);

      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    test("2.3 Ngozi attempts Socket.IO join and send in Tech Accessories chat -> rejected", async () => {
      ngoziSocket = ClientIO(`http://localhost:${serverPort}`, {
        auth: { token: ngoziToken },
        transports: ['websocket'],
      });

      await new Promise((resolve) => ngoziSocket.on('connect', resolve));

      // Attempt join
      const joinError = await new Promise((resolve) => {
        ngoziSocket.once('error', resolve);
        ngoziSocket.emit('join-conversation', { conversationId: techVendorConv.id });
      });

      expect(joinError.message).toBe('Access denied to this conversation');

      // Attempt send
      const sendError = await new Promise((resolve) => {
        ngoziSocket.once('error', resolve);
        ngoziSocket.emit('send-message', {
          conversationId: techVendorConv.id,
          content: 'Ngozi cross-group socket send attempt',
        });
      });

      expect(sendError.message).toBe('Access denied');
    });

    test("2.4 Cross-group role downgrade: Afam is admin in Tech Accessories but only member in Neighborhood Grocery -> REST send rejected with 403", async () => {
      // Afam is 'member' in Neighborhood Grocery (Fresh Farm Collective chat)
      const res = await request(app)
        .post(`/api/chat/conversations/${groceryVendorConv.id}/messages`)
        .set('Authorization', `Bearer ${afamToken}`)
        .send({ content: 'Afam trying to send in Grocery vendor chat where he is only member' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('You do not have permission to send messages in this conversation');
    });

    test("2.5 Afam Socket.IO send in Grocery vendor chat -> rejected with permission error", async () => {
      const afamSocket = ClientIO(`http://localhost:${serverPort}`, {
        auth: { token: afamToken },
        transports: ['websocket'],
      });
      await new Promise((resolve) => afamSocket.on('connect', resolve));

      const errorResult = await new Promise((resolve) => {
        afamSocket.once('error', resolve);
        afamSocket.emit('send-message', {
          conversationId: groceryVendorConv.id,
          content: 'Afam trying to send where he is non-admin',
        });
      });

      afamSocket.disconnect();
      expect(errorResult.message).toBe('You do not have permission to send messages in this conversation');
    });
  });

  // =========================================================================
  // CHALLENGE 3: Vendor A Attacking Vendor B's Vendor Chat
  // =========================================================================
  describe("Challenge 3: Vendor A attacking Vendor B's vendor chat", () => {
    test("3.1 Fresh Farm Vendor attempts REST POST to Tech Wholesale Hub chat -> 403 Forbidden", async () => {
      const res = await request(app)
        .post(`/api/chat/conversations/${techVendorConv.id}/messages`)
        .set('Authorization', `Bearer ${freshVendorToken}`)
        .send({ content: 'Fresh Farm vendor intruding Tech chat' });

      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    test("3.2 Fresh Farm Vendor attempts REST GET messages of Tech Wholesale Hub chat -> 403 Forbidden", async () => {
      const res = await request(app)
        .get(`/api/chat/conversations/${techVendorConv.id}/messages`)
        .set('Authorization', `Bearer ${freshVendorToken}`);

      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    test("3.3 Fresh Farm Vendor attempts Socket.IO join and send in Tech Wholesale Hub chat -> rejected", async () => {
      freshVendorSocket = ClientIO(`http://localhost:${serverPort}`, {
        auth: { token: freshVendorToken },
        transports: ['websocket'],
      });
      await new Promise((resolve) => freshVendorSocket.on('connect', resolve));

      const joinError = await new Promise((resolve) => {
        freshVendorSocket.once('error', resolve);
        freshVendorSocket.emit('join-conversation', { conversationId: techVendorConv.id });
      });
      expect(joinError.message).toBe('Access denied to this conversation');

      const sendError = await new Promise((resolve) => {
        freshVendorSocket.once('error', resolve);
        freshVendorSocket.emit('send-message', {
          conversationId: techVendorConv.id,
          content: 'Cross vendor socket attack',
        });
      });
      expect(sendError.message).toBe('Access denied');
    });

    test("3.4 Unassigned Vendor (SolarTech) attempts REST POST to Tech Wholesale Hub chat -> 403 Forbidden", async () => {
      const res = await request(app)
        .post(`/api/chat/conversations/${techVendorConv.id}/messages`)
        .set('Authorization', `Bearer ${solarVendorToken}`)
        .send({ content: 'SolarTech vendor unauthorized message' });

      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // CHALLENGE 4: Unauthenticated User & Unrelated Stranger Access
  // =========================================================================
  describe('Challenge 4: Unauthenticated user and unrelated stranger access', () => {
    test('4.1 Unauthenticated REST requests (no token, bad token, expired token) -> 401 Unauthorized', async () => {
      // No token
      const noTokenRes = await request(app)
        .get(`/api/chat/conversations/${techVendorConv.id}/messages`);
      expect(noTokenRes.status).toBe(401);
      expect(noTokenRes.body.error).toBe('Access token required');

      // Invalid signature token
      const badSigToken = jwt.sign({ userId: chiomaUser.id, role: 'member' }, 'wrong-secret-key-12345');
      const badTokenRes = await request(app)
        .get(`/api/chat/conversations/${techVendorConv.id}/messages`)
        .set('Authorization', `Bearer ${badSigToken}`);
      expect(badTokenRes.status).toBe(401);
      expect(badTokenRes.body.error).toBe('Invalid token');

      // Expired token
      const expiredToken = generateToken(chiomaUser.id, 'member', '-1s');
      const expiredRes = await request(app)
        .get(`/api/chat/conversations/${techVendorConv.id}/messages`)
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(expiredRes.status).toBe(401);
      expect(expiredRes.body.error).toBe('Token expired');
    });

    test('4.2 Unauthenticated Socket.IO connection rejected during handshake', async () => {
      // No token
      const noTokenSocket = ClientIO(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });

      const noTokenErr = await new Promise((resolve) => {
        noTokenSocket.on('connect_error', resolve);
      });
      expect(noTokenErr.message).toContain('Authentication error: No token provided');
      noTokenSocket.disconnect();

      // Bad token
      const badTokenSocket = ClientIO(`http://localhost:${serverPort}`, {
        auth: { token: 'bogus.jwt.token' },
        transports: ['websocket'],
      });

      const badTokenErr = await new Promise((resolve) => {
        badTokenSocket.on('connect_error', resolve);
      });
      expect(badTokenErr.message).toContain('Authentication error: Invalid token');
      badTokenSocket.disconnect();
    });

    test('4.3 Unrelated Stranger cannot list, view, fetch participants, or message in group-vendor chats', async () => {
      // 1. GET /api/chat/conversations -> techVendorConv must NOT be in returned data
      const listRes = await request(app)
        .get('/api/chat/conversations')
        .set('Authorization', `Bearer ${strangerToken}`);
      expect(listRes.status).toBe(200);
      const found = listRes.body.data.find(c => c.id === techVendorConv.id);
      expect(found).toBeUndefined();

      // 2. GET /api/chat/conversations/:id -> 404
      const singleRes = await request(app)
        .get(`/api/chat/conversations/${techVendorConv.id}`)
        .set('Authorization', `Bearer ${strangerToken}`);
      expect(singleRes.status).toBe(404);

      // 3. GET /api/chat/conversations/:id/participants -> 403
      const partRes = await request(app)
        .get(`/api/chat/conversations/${techVendorConv.id}/participants`)
        .set('Authorization', `Bearer ${strangerToken}`);
      expect(partRes.status).toBe(403);

      // 4. GET /api/chat/conversations/:id/messages -> 403
      const msgRes = await request(app)
        .get(`/api/chat/conversations/${techVendorConv.id}/messages`)
        .set('Authorization', `Bearer ${strangerToken}`);
      expect(msgRes.status).toBe(403);

      // 5. POST /api/chat/conversations/:id/messages -> 403
      const sendRes = await request(app)
        .post(`/api/chat/conversations/${techVendorConv.id}/messages`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .send({ content: 'Stranger unauthorized penetration' });
      expect(sendRes.status).toBe(403);
    });

    test('4.4 Unrelated Stranger Socket.IO room isolation and send rejection', async () => {
      strangerSocket = ClientIO(`http://localhost:${serverPort}`, {
        auth: { token: strangerToken },
        transports: ['websocket'],
      });
      await new Promise((resolve) => strangerSocket.on('connect', resolve));

      // Attempt join
      const joinError = await new Promise((resolve) => {
        strangerSocket.once('error', resolve);
        strangerSocket.emit('join-conversation', { conversationId: techVendorConv.id });
      });
      expect(joinError.message).toBe('Access denied to this conversation');

      // Attempt send
      const sendError = await new Promise((resolve) => {
        strangerSocket.once('error', resolve);
        strangerSocket.emit('send-message', {
          conversationId: techVendorConv.id,
          content: 'Stranger socket injection',
        });
      });
      expect(sendError.message).toBe('Access denied');
    });
  });

  // =========================================================================
  // CHALLENGE 5: Edge Cases, Input Validation & Database Zero-Leakage
  // =========================================================================
  describe('Challenge 5: Edge cases, input validation & database zero-leakage', () => {
    test('5.1 Empty and whitespace-only message rejection via REST -> 400 Bad Request', async () => {
      const emptyRes = await request(app)
        .post(`/api/chat/conversations/${techVendorConv.id}/messages`)
        .set('Authorization', `Bearer ${afamToken}`)
        .send({ content: '   ' });

      expect(emptyRes.status).toBe(400);
      expect(emptyRes.body.error).toBe('Message content is required');
    });

    test('5.2 Empty and oversized message rejection via Socket.IO', async () => {
      const afamSocket = ClientIO(`http://localhost:${serverPort}`, {
        auth: { token: afamToken },
        transports: ['websocket'],
      });
      await new Promise((resolve) => afamSocket.on('connect', resolve));

      // Empty message
      const emptyErr = await new Promise((resolve) => {
        afamSocket.once('error', resolve);
        afamSocket.emit('send-message', {
          conversationId: techVendorConv.id,
          content: '    ',
        });
      });
      expect(emptyErr.message).toBe('Message content is required');

      // Oversized message (>5000 characters)
      const hugeContent = 'A'.repeat(5001);
      const hugeErr = await new Promise((resolve) => {
        afamSocket.once('error', resolve);
        afamSocket.emit('send-message', {
          conversationId: techVendorConv.id,
          content: hugeContent,
        });
      });
      expect(hugeErr.message).toBe('Message is too long (max 5000 characters)');

      afamSocket.disconnect();
    });

    test('5.3 Zero-leakage database audit: Confirm no illegal messages from Chioma, Ngozi, Fresh Vendor, or Stranger exist in Tech Accessories chat', async () => {
      const auditRes = await pool.query(
        `SELECT m.id, m.content, m.sender_id, u.name, u.email
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.conversation_id = $1 AND m.sender_id IN ($2, $3, $4, $5)`,
        [
          techVendorConv.id,
          chiomaUser.id,
          ngoziUser.id,
          freshVendorUser.id,
          strangerUser.id,
        ]
      );

      // Audit must return 0 messages
      expect(auditRes.rows).toHaveLength(0);
    });
  });
});
