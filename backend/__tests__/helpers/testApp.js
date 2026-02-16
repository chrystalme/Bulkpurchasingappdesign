import express from 'express';
import chatRoutes from '../../routes/chat.routes.js';

/**
 * Create an Express app configured for testing.
 * Injects a mock authenticateToken middleware that uses the provided user.
 */
export function createTestApp(mockUser) {
  const app = express();
  app.use(express.json());

  // Mock auth middleware — attaches the provided user to req
  app.use((req, res, next) => {
    req.user = mockUser;
    next();
  });

  // Mount chat routes (they internally use authenticateToken, but
  // we need to bypass it. We'll mount the route handlers directly.)
  app.use('/api/chat', chatRoutes);

  return app;
}

export default createTestApp;
