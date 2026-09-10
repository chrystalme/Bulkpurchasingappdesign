/**
 * Dispute Permissions Tests
 * Validates that:
 * 1. Admin and SuperUser CANNOT open a dispute (only group admin can)
 * 2. Regular members who are NOT group admin cannot open a dispute
 * 3. Group admin can open a dispute
 * 4. Admin and SuperUser CAN mediate and resolve disputes
 */
import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import mockPool, { setMockQueryResults, resetMocks, mockClient } from './helpers/mockPool.js';

// Mock database pool
jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool,
}));

let mockUser = {
  id: 'user-admin-1',
  role: 'admin',
  is_active: true,
};

jest.unstable_mockModule('../middleware/auth.js', () => ({
  authenticateToken: (req, res, next) => {
    req.user = mockUser;
    next();
  },
  canManageUsers: (req, res, next) => next(),
  canDeleteUsers: (req, res, next) => next(),
  requireRole: (...roles) => (req, res, next) => {
    if (roles.includes(req.user.role)) next();
    else res.status(403).json({ error: 'Insufficient permissions' });
  },
  canAccessVendorDashboard: (req, res, next) => next(),
  ownsResourceOrAdmin: () => (req, res, next) => next(),
}));

const escrowRouter = (await import('../routes/escrow.routes.js')).default;

describe('Dispute Creation and Resolution Permissions', () => {
  let app;

  beforeEach(() => {
    resetMocks();
    app = express();
    app.use(express.json());
    app.use('/api/escrow', escrowRouter);
  });

  describe('POST /api/escrow/disputes (Dispute Opening)', () => {
    test('Admin CANNOT create a dispute', async () => {
      mockUser = { id: 'admin-1', role: 'admin', is_active: true };

      const res = await request(app)
        .post('/api/escrow/disputes')
        .send({
          transactionId: 'tx-1',
          reason: 'Damaged items',
          description: 'Product arrived broken',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/only group admins can/i);
    });

    test('SuperUser CANNOT create a dispute', async () => {
      mockUser = { id: 'super-1', role: 'superUser', is_active: true };

      const res = await request(app)
        .post('/api/escrow/disputes')
        .send({
          transactionId: 'tx-1',
          reason: 'Damaged items',
          description: 'Product arrived broken',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/only group admins can/i);
    });

    test('Regular member who is NOT group admin CANNOT create a dispute', async () => {
      mockUser = { id: 'member-not-admin', role: 'member', is_active: true };

      // Mock txCheck: transaction exists
      // Mock group admin check: returns not admin
      setMockQueryResults([
        {
          rows: [
            {
              id: 'tx-1',
              order_id: 'ord-1',
              buyer_id: 'member-not-admin',
              seller_id: 'vendor-1',
              status: 'pending_inspection',
            },
          ],
        },
        // group admin check query returns empty (user is not group admin)
        { rows: [] },
      ]);

      const res = await request(app)
        .post('/api/escrow/disputes')
        .send({
          transactionId: 'tx-1',
          reason: 'Damaged items',
          description: 'Product arrived broken',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/only the group admin/i);
    });

    test('Group admin CAN create a dispute', async () => {
      mockUser = { id: 'group-admin-user', role: 'member', is_active: true };

      setMockQueryResults([
        // txCheck
        {
          rows: [
            {
              id: 'tx-1',
              order_id: 'ord-1',
              buyer_id: 'group-admin-user',
              seller_id: 'vendor-1',
              status: 'pending_inspection',
            },
          ],
        },
        // group admin check query returns role: admin
        { rows: [{ role: 'admin' }] },
        // BEGIN
        { rows: [] },
        // UPDATE escrow_transactions
        { rows: [] },
        // INSERT dispute
        {
          rows: [
            {
              id: 'disp-1',
              dispute_number: 'DIS-123456',
              transaction_id: 'tx-1',
              reason: 'Damaged items',
              status: 'open',
            },
          ],
        },
        // COMMIT
        { rows: [] },
      ]);

      const res = await request(app)
        .post('/api/escrow/disputes')
        .send({
          transactionId: 'tx-1',
          reason: 'Damaged items',
          description: 'Product arrived broken',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dispute_number).toBe('DIS-123456');
    });
  });

  describe('POST /api/escrow/disputes/:id/resolve (Mediation and Resolution)', () => {
    test('Admin CAN resolve a dispute', async () => {
      mockUser = { id: 'admin-1', role: 'admin', is_active: true };

      setMockQueryResults([
        // BEGIN
        { rows: [] },
        // UPDATE disputes
        {
          rows: [
            {
              id: 'disp-1',
              transaction_id: 'tx-1',
              status: 'resolved',
              resolution: 'refund_buyer',
            },
          ],
        },
        // UPDATE escrow_transactions
        { rows: [] },
        // COMMIT
        { rows: [] },
      ]);

      const res = await request(app)
        .post('/api/escrow/disputes/disp-1/resolve')
        .send({
          resolution: 'refund_buyer',
          adminNotes: 'Mediated and approved refund to group',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('resolved');
    });

    test('SuperUser CAN resolve a dispute', async () => {
      mockUser = { id: 'super-1', role: 'superUser', is_active: true };

      setMockQueryResults([
        // BEGIN
        { rows: [] },
        // UPDATE disputes
        {
          rows: [
            {
              id: 'disp-1',
              transaction_id: 'tx-1',
              status: 'resolved',
              resolution: 'release_seller',
            },
          ],
        },
        // UPDATE escrow_transactions
        { rows: [] },
        // COMMIT
        { rows: [] },
      ]);

      const res = await request(app)
        .post('/api/escrow/disputes/disp-1/resolve')
        .send({
          resolution: 'release_seller',
          adminNotes: 'SuperUser resolution: evidence shows goods delivered intact',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('Member CANNOT resolve a dispute', async () => {
      mockUser = { id: 'member-1', role: 'member', is_active: true };

      const res = await request(app)
        .post('/api/escrow/disputes/disp-1/resolve')
        .send({ resolution: 'refund_buyer' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/only admins and super users/i);
    });
  });
});
