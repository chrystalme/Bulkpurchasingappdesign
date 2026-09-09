/**
 * User Roles & Management Permissions Tests
 * Validates that:
 * 1. Admin cannot see superUser accounts in GET /api/users
 * 2. Admin cannot see super_users count in GET /api/users/stats
 * 3. Admin cannot view, edit, activate, deactivate, or delete superUser accounts
 * 4. SuperUser cannot delete their own account or the last remaining superUser
 */
import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import mockPool, { setMockQueryResults, resetMocks } from './helpers/mockPool.js';

// Mock database pool
jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool,
}));

// Mock authentication middleware to simulate different roles
let mockUser = {
  id: 'admin-1',
  email: 'admin@savetogether.com',
  name: 'Admin User',
  role: 'admin',
  is_active: true,
};

jest.unstable_mockModule('../middleware/auth.js', () => ({
  authenticateToken: (req, res, next) => {
    req.user = mockUser;
    next();
  },
  canManageUsers: (req, res, next) => {
    if (req.user.role === 'superUser' || req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'Only superUser and admin can manage users' });
    }
  },
  canDeleteUsers: (req, res, next) => {
    if (req.user.role === 'superUser') {
      next();
    } else {
      res.status(403).json({ error: 'Only superUser can delete users' });
    }
  },
  requireRole: (...roles) => (req, res, next) => {
    if (roles.includes(req.user.role)) next();
    else res.status(403).json({ error: 'Insufficient permissions' });
  },
  canAccessVendorDashboard: (req, res, next) => {
    if (req.user.role === 'vendor') next();
    else res.status(403).json({ error: 'Vendor access required' });
  },
}));

// Import users routes dynamically after mocks
const usersRouter = (await import('../routes/users.routes.js')).default;

describe('User Management Role Isolation', () => {
  let app;

  beforeEach(() => {
    resetMocks();
    app = express();
    app.use(express.json());
    app.use('/api/users', usersRouter);
  });

  describe('GET /api/users (Admin vs SuperUser list visibility)', () => {
    test('Admin should NOT receive superUser accounts in user list', async () => {
      mockUser = { id: 'admin-1', role: 'admin', is_active: true };

      let capturedSql = '';
      const originalQuery = mockPool.query;
      mockPool.query = async (sql, params) => {
        capturedSql = sql;
        return {
          rows: [
            { id: 'u-2', email: 'vendor@test.com', role: 'vendor' },
            { id: 'u-3', email: 'member@test.com', role: 'member' },
          ],
        };
      };

      const res = await request(app).get('/api/users');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(capturedSql).toContain("role != 'superUser'");
      expect(res.body.data.some(u => u.role === 'superUser')).toBe(false);

      mockPool.query = originalQuery;
    });

    test('SuperUser receives all users including superUser accounts', async () => {
      mockUser = { id: 'super-1', role: 'superUser', is_active: true };

      let capturedSql = '';
      const originalQuery = mockPool.query;
      mockPool.query = async (sql, params) => {
        capturedSql = sql;
        return {
          rows: [
            { id: 'super-1', email: 'super@test.com', role: 'superUser' },
            { id: 'admin-1', email: 'admin@test.com', role: 'admin' },
          ],
        };
      };

      const res = await request(app).get('/api/users');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(capturedSql).not.toContain("role != 'superUser'");

      mockPool.query = originalQuery;
    });
  });

  describe('GET /api/users/stats', () => {
    test('Admin receives stats where super_users is 0 and total excludes superUser', async () => {
      mockUser = { id: 'admin-1', role: 'admin', is_active: true };

      let capturedSql = '';
      const originalQuery = mockPool.query;
      mockPool.query = async (sql, params) => {
        capturedSql = sql;
        return {
          rows: [
            {
              total: '5',
              active: '5',
              super_users: 0,
              admins: '1',
              vendors: '2',
              members: '2',
            },
          ],
        };
      };

      const res = await request(app).get('/api/users/stats');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(capturedSql).toContain("role != 'superUser'");

      mockPool.query = originalQuery;
    });
  });

  describe('Admin protection on superUser targets', () => {
    test('Admin cannot view details of a superUser by id', async () => {
      mockUser = { id: 'admin-1', role: 'admin', is_active: true };

      setMockQueryResults([
        {
          rows: [{ id: 'super-1', email: 'super@test.com', role: 'superUser' }],
        },
      ]);

      const res = await request(app).get('/api/users/super-1');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('User not found');
    });

    test('Admin cannot update a superUser account', async () => {
      mockUser = { id: 'admin-1', role: 'admin', is_active: true };

      setMockQueryResults([
        {
          rows: [{ id: 'super-1', role: 'superUser' }],
        },
      ]);

      const res = await request(app)
        .put('/api/users/super-1')
        .send({ name: 'Hacked Super' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/cannot modify a super user/i);
    });

    test('Admin cannot deactivate a superUser account', async () => {
      mockUser = { id: 'admin-1', role: 'admin', is_active: true };

      setMockQueryResults([
        {
          rows: [{ id: 'super-1', role: 'superUser' }],
        },
      ]);

      const res = await request(app).post('/api/users/super-1/deactivate');
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/super user/i);
    });

    test('Admin cannot delete any account', async () => {
      mockUser = { id: 'admin-1', role: 'admin', is_active: true };

      const res = await request(app).delete('/api/users/some-user');
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/only superuser/i);
    });
  });

  describe('SuperUser delete constraints', () => {
    test('SuperUser cannot delete their own account', async () => {
      mockUser = { id: 'super-1', role: 'superUser', is_active: true };

      const res = await request(app).delete('/api/users/super-1');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/cannot delete your own account/i);
    });

    test('SuperUser cannot delete the last remaining superUser', async () => {
      mockUser = { id: 'super-1', role: 'superUser', is_active: true };

      setMockQueryResults([
        // target user query
        { rows: [{ id: 'super-2', role: 'superUser' }] },
        // count of super users
        { rows: [{ count: '1' }] },
      ]);

      const res = await request(app).delete('/api/users/super-2');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/cannot delete the last super user/i);
    });
  });
});
