import jwt from 'jsonwebtoken';

const TEST_JWT_SECRET = 'test-secret-key-for-testing-only';

// Set the JWT_SECRET env var for tests
process.env.JWT_SECRET = TEST_JWT_SECRET;

/**
 * Generate a valid JWT token for testing.
 */
export function generateTestToken(userId, role = 'member') {
  return jwt.sign({ userId, role }, TEST_JWT_SECRET, { expiresIn: '1h' });
}

/**
 * Create a mock user object as returned by the auth middleware.
 */
export function createMockUser(overrides = {}) {
  return {
    id: 'user-1-uuid',
    email: 'testuser@example.com',
    name: 'Test User',
    role: 'member',
    avatar: null,
    vendor_id: null,
    trust_score: 0,
    is_active: true,
    ...overrides,
  };
}

/**
 * Create a mock admin user.
 */
export function createMockAdmin(overrides = {}) {
  return createMockUser({
    id: 'admin-1-uuid',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    ...overrides,
  });
}

/**
 * Create a mock vendor user.
 */
export function createMockVendor(overrides = {}) {
  return createMockUser({
    id: 'vendor-1-uuid',
    email: 'vendor@example.com',
    name: 'Vendor User',
    role: 'vendor',
    ...overrides,
  });
}

export default {
  generateTestToken,
  createMockUser,
  createMockAdmin,
  createMockVendor,
};
