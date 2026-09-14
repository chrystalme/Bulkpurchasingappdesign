/**
 * Milestone 3: Group-Vendor Chat Visibility & Permissions Test Suite
 *
 * Verifies:
 * 1. Chioma (member in Tech Accessories) logs in and calls GET /api/chat/conversations -> Sees "Tech Wholesale Hub" group-vendor chat with canSend: false.
 * 2. Chioma calls GET /api/chat/conversations/:id/messages -> Successfully fetches message history (200 OK).
 * 3. Chioma attempts POST /api/chat/conversations/:id/messages -> Rejected with 403 Forbidden ("You do not have permission to send messages in this conversation").
 * 4. Chioma connects via Socket.IO and joins conversation room conversation:${id} -> Receives messages in real time.
 * 5. Chioma emits send-message via Socket.IO -> Rejected with error event.
 * 6. Afam (admin in Tech Accessories) calls POST /api/chat/conversations/:id/messages -> 201 Created; Chioma receives it in real time via Socket.IO.
 * 7. Tech Wholesale Hub Vendor (vendor@techwholesale.com) calls POST /api/chat/conversations/:id/messages -> 201 Created; Chioma receives it in real time via Socket.IO.
 * 8. Stranger (user not in group) calls GET /api/chat/conversations/:id/messages and POST -> Rejected with 403 / 404.
 * 9. Dynamically added group member (late joiner to group) -> Automatically receives read access to existing group-vendor chats.
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

describe('Milestone 3: Group-Vendor Chat Visibility & Permissions (R2)', () => {
  let app;
  let httpServer;
  let io;
  let serverPort;

  let chiomaUser;
  let afamUser;
  let vendorUser;
  let strangerUser;
  let lateJoinerUser;

  let chiomaToken;
  let afamToken;
  let vendorToken;
  let strangerToken;
  let lateJoinerToken;

  let techAccessoriesGroup;
  let techVendorConv;

  let chiomaSocket;

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

    // 2. Fetch or create a stranger user who is NOT in Tech Accessories group
    let strangerRes = await pool.query(
      `SELECT id, email, name, role FROM users WHERE email = 'chat_stranger@example.com'`
    );
    if (strangerRes.rows.length === 0) {
      const createRes = await pool.query(
        `INSERT INTO users (email, password_hash, name, role, is_active)
         VALUES ('chat_stranger@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyz123456', 'Chat Stranger', 'member', true)
         RETURNING id, email, name, role`
      );
      strangerUser = createRes.rows[0];
    } else {
      strangerUser = strangerRes.rows[0];
    }

    // 3. Fetch Tech Accessories group and its group-vendor conversation with Tech Wholesale Hub
    const groupRes = await pool.query(
      `SELECT id, name FROM groups WHERE name = 'Tech Accessories' LIMIT 1`
    );
    techAccessoriesGroup = groupRes.rows[0];
    expect(techAccessoriesGroup).toBeDefined();

    // Ensure stranger is not in Tech Accessories group
    await pool.query(
      `DELETE FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [techAccessoriesGroup.id, strangerUser.id]
    );

    const convRes = await pool.query(
      `SELECT id, title, type, group_id, vendor_id 
       FROM conversations 
       WHERE group_id = $1 AND type = 'group-vendor' 
       LIMIT 1`,
      [techAccessoriesGroup.id]
    );
    techVendorConv = convRes.rows[0];
    expect(techVendorConv).toBeDefined();

    // Ensure stranger is not in conversation_participants
    await pool.query(
      `DELETE FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [techVendorConv.id, strangerUser.id]
    );

    // 4. Generate JWT tokens
    chiomaToken = generateToken(chiomaUser.id, chiomaUser.role);
    afamToken = generateToken(afamUser.id, afamUser.role);
    vendorToken = generateToken(vendorUser.id, vendorUser.role);
    strangerToken = generateToken(strangerUser.id, strangerUser.role);

    // 5. Setup Express app & HTTP/Socket.IO server
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
    if (chiomaSocket?.connected) {
      chiomaSocket.disconnect();
    }
    if (lateJoinerUser) {
      await pool.query('DELETE FROM group_members WHERE user_id = $1', [lateJoinerUser.id]);
      await pool.query('DELETE FROM conversation_participants WHERE user_id = $1', [lateJoinerUser.id]);
      await pool.query('DELETE FROM users WHERE id = $1', [lateJoinerUser.id]);
    }
    if (strangerUser) {
      await pool.query('DELETE FROM conversation_participants WHERE user_id = $1', [strangerUser.id]);
      await pool.query('DELETE FROM users WHERE id = $1', [strangerUser.id]);
    }

    io.close();
    await new Promise((resolve) => httpServer.close(resolve));
  });

  // -------------------------------------------------------------------------
  // Test 1: Chioma logs in and lists conversations
  // -------------------------------------------------------------------------
  test('1. Chioma logs in and calls GET /api/chat/conversations -> Sees "Tech Wholesale Hub" with canSend: false', async () => {
    const res = await request(app)
      .get('/api/chat/conversations')
      .set('Authorization', `Bearer ${chiomaToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    const vendorConv = res.body.data.find(c => c.id === techVendorConv.id);
    expect(vendorConv).toBeDefined();
    expect(vendorConv.type).toBe('group-vendor');
    expect(vendorConv.title).toBe('Tech Wholesale Hub');
    expect(vendorConv.canSend).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Test 2: Chioma fetches message history
  // -------------------------------------------------------------------------
  test('2. Chioma calls GET /api/chat/conversations/:id/messages -> Successfully fetches message history (200 OK)', async () => {
    const res = await request(app)
      .get(`/api/chat/conversations/${techVendorConv.id}/messages`)
      .set('Authorization', `Bearer ${chiomaToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Test 3: Chioma attempts to send message via REST
  // -------------------------------------------------------------------------
  test('3. Chioma attempts POST /api/chat/conversations/:id/messages -> Rejected with 403 Forbidden', async () => {
    const res = await request(app)
      .post(`/api/chat/conversations/${techVendorConv.id}/messages`)
      .set('Authorization', `Bearer ${chiomaToken}`)
      .send({ content: 'Member trying to send unauthorized message' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('You do not have permission to send messages in this conversation');
  });

  // -------------------------------------------------------------------------
  // Test 4: Chioma connects via Socket.IO and joins conversation room
  // -------------------------------------------------------------------------
  test('4. Chioma connects via Socket.IO and joins conversation room conversation:${id}', async () => {
    chiomaSocket = ClientIO(`http://localhost:${serverPort}`, {
      auth: { token: chiomaToken },
      transports: ['websocket'],
    });

    await new Promise((resolve, reject) => {
      chiomaSocket.on('connect', resolve);
      chiomaSocket.on('connect_error', reject);
    });
    expect(chiomaSocket.connected).toBe(true);

    const joinResult = await new Promise((resolve) => {
      chiomaSocket.on('joined-conversation', resolve);
      chiomaSocket.emit('join-conversation', { conversationId: techVendorConv.id });
    });

    expect(joinResult.conversationId).toBe(techVendorConv.id);
  });

  // -------------------------------------------------------------------------
  // Test 5: Chioma emits send-message via Socket.IO
  // -------------------------------------------------------------------------
  test('5. Chioma emits send-message via Socket.IO -> Rejected with error event', async () => {
    const errorResult = await new Promise((resolve) => {
      chiomaSocket.once('error', resolve);
      chiomaSocket.emit('send-message', {
        conversationId: techVendorConv.id,
        content: 'Unauthorized socket message from member',
      });
    });

    expect(errorResult).toBeDefined();
    expect(errorResult.message).toBe('You do not have permission to send messages in this conversation');
  });

  // -------------------------------------------------------------------------
  // Test 6: Afam sends message via REST -> Chioma receives in real time
  // -------------------------------------------------------------------------
  test('6. Afam (admin) calls POST /api/chat/conversations/:id/messages -> 201 Created; Chioma receives it in real time via Socket.IO', async () => {
    const messagePromise = new Promise((resolve) => {
      chiomaSocket.once('new-message', resolve);
    });

    const testContent = `Admin message from Afam at ${Date.now()}`;
    const res = await request(app)
      .post(`/api/chat/conversations/${techVendorConv.id}/messages`)
      .set('Authorization', `Bearer ${afamToken}`)
      .send({ content: testContent });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.content).toBe(testContent);

    const receivedMessage = await messagePromise;
    expect(receivedMessage).toBeDefined();
    expect(receivedMessage.content).toBe(testContent);
    expect(receivedMessage.senderId).toBe(afamUser.id);
    expect(receivedMessage.conversationId).toBe(techVendorConv.id);
  });

  // -------------------------------------------------------------------------
  // Test 7: Tech Wholesale Hub Vendor sends message -> Chioma receives in real time
  // -------------------------------------------------------------------------
  test('7. Tech Wholesale Hub Vendor calls POST /api/chat/conversations/:id/messages -> 201 Created; Chioma receives it in real time via Socket.IO', async () => {
    const messagePromise = new Promise((resolve) => {
      chiomaSocket.once('new-message', resolve);
    });

    const testContent = `Vendor reply from Tech Wholesale Hub at ${Date.now()}`;
    const res = await request(app)
      .post(`/api/chat/conversations/${techVendorConv.id}/messages`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ content: testContent });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.content).toBe(testContent);

    const receivedMessage = await messagePromise;
    expect(receivedMessage).toBeDefined();
    expect(receivedMessage.content).toBe(testContent);
    expect(receivedMessage.senderId).toBe(vendorUser.id);
    expect(receivedMessage.conversationId).toBe(techVendorConv.id);
  });

  // -------------------------------------------------------------------------
  // Test 8: Stranger calls GET and POST -> Rejected with 403 / 404
  // -------------------------------------------------------------------------
  test('8. Stranger (user not in group) calls GET and POST -> Rejected with 403 / 404', async () => {
    // Attempt GET messages
    const getRes = await request(app)
      .get(`/api/chat/conversations/${techVendorConv.id}/messages`)
      .set('Authorization', `Bearer ${strangerToken}`);

    expect([403, 404]).toContain(getRes.status);
    expect(getRes.body.success).toBe(false);

    // Attempt POST message
    const postRes = await request(app)
      .post(`/api/chat/conversations/${techVendorConv.id}/messages`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .send({ content: 'Stranger trying to send' });

    expect([403, 404]).toContain(postRes.status);
    expect(postRes.body.success).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Test 9: Dynamically added group member gets read access automatically
  // -------------------------------------------------------------------------
  test('9. Dynamically added group member (late joiner) -> Automatically receives read access to existing group-vendor chats', async () => {
    // 1. Create a brand new user
    const createRes = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, email, name, role`,
      [
        `latejoiner_${Date.now()}@example.com`,
        '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
        'Late Joiner',
        'member',
      ]
    );
    lateJoinerUser = createRes.rows[0];
    lateJoinerToken = generateToken(lateJoinerUser.id, lateJoinerUser.role);

    // Verify before joining: cannot see conversation
    const preRes = await request(app)
      .get('/api/chat/conversations')
      .set('Authorization', `Bearer ${lateJoinerToken}`);
    expect(preRes.status).toBe(200);
    const preConv = preRes.body.data.find(c => c.id === techVendorConv.id);
    expect(preConv).toBeUndefined();

    // 2. Add late joiner to Tech Accessories group in group_members table
    await pool.query(
      `INSERT INTO group_members (group_id, user_id, role)
       VALUES ($1, $2, 'member')`,
      [techAccessoriesGroup.id, lateJoinerUser.id]
    );

    // 3. Call GET /api/chat/conversations -> Now automatically sees Tech Wholesale Hub with canSend: false
    const listRes = await request(app)
      .get('/api/chat/conversations')
      .set('Authorization', `Bearer ${lateJoinerToken}`);

    expect(listRes.status).toBe(200);
    const joinedConv = listRes.body.data.find(c => c.id === techVendorConv.id);
    expect(joinedConv).toBeDefined();
    expect(joinedConv.title).toBe('Tech Wholesale Hub');
    expect(joinedConv.canSend).toBe(false);

    // 4. Call GET /api/chat/conversations/:id/messages -> 200 OK
    const msgRes = await request(app)
      .get(`/api/chat/conversations/${techVendorConv.id}/messages`)
      .set('Authorization', `Bearer ${lateJoinerToken}`);
    expect(msgRes.status).toBe(200);
    expect(msgRes.body.success).toBe(true);

    // 5. Attempt POST /api/chat/conversations/:id/messages -> 403 Forbidden
    const sendRes = await request(app)
      .post(`/api/chat/conversations/${techVendorConv.id}/messages`)
      .set('Authorization', `Bearer ${lateJoinerToken}`)
      .send({ content: 'Late joiner attempting send' });
    expect(sendRes.status).toBe(403);
    expect(sendRes.body.error).toBe('You do not have permission to send messages in this conversation');
  });
});
