import express from 'express';
import http from 'http'; // For creating the HTTP server for Socket.IO
import { Server } from 'socket.io'; // For Socket.IO server
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.js';

// Import security middleware
import { generalApiLimiter } from './middleware/rateLimit.js';
import { csrfErrorHandler } from './middleware/csrf.js';
import { apiTimeout, responseTimeout, timeoutErrorHandler } from './middleware/timeout.js';
import { cacheMiddleware, apiCacheMiddleware } from './middleware/caching.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import productsRoutes from './routes/products.routes.js';
import vendorsRoutes from './routes/vendors.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import escrowRoutes from './routes/escrow.routes.js';
import groupRoutes from './routes/groups.routes.js';
import chatRoutes from './routes/chat.routes.js';

// Import Socket.IO chat initializer
import { initializeChatSocket } from './socket/chat.socket.js';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app); // Create HTTP server for Express and Socket.IO
const PORT = process.env.PORT || 3001;
const allowedOrigins = (process.env.CORS_ORIGIN || process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods
    credentials: true,
  },
});

// Make io accessible to routes (if needed, though direct import in route files is often cleaner for ES Modules)
app.set('io', io);

// ============================================
// Security Middleware (Applied First)
// ============================================

// Helmet.js - Set security HTTP headers
app.use(helmet({
  frameguard: { action: 'deny' }, // X-Frame-Options: DENY
  noSniff: true, // X-Content-Type-Options: nosniff
  xssFilter: true, // X-XSS-Protection: 1; mode=block
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", 'ws:', 'wss:'],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));

// Middleware
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

// Gzip compression middleware (apply after CORS)
app.use(compression({
  level: 6,
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
}));

app.use(express.json()); // Parses incoming requests with JSON payloads
app.use(express.urlencoded({ extended: true })); // Parses incoming requests with URL-encoded payloads

// Request timeout middleware
app.use(apiTimeout);
app.use(responseTimeout(30000));

// Rate limiting middleware
app.use(generalApiLimiter);

// Caching middleware
app.use(cacheMiddleware);

// Endpoint-specific caching
app.use('/api/products', apiCacheMiddleware.products);
app.use('/api/vendors', apiCacheMiddleware.vendors);
app.use('/api/orders', apiCacheMiddleware.orders);
app.use('/api/groups', apiCacheMiddleware.groups);
app.use('/api/chat', apiCacheMiddleware.chat);
app.use('/api/auth', apiCacheMiddleware.auth);
app.use('/api/users', apiCacheMiddleware.users);
app.use('/api/escrow', apiCacheMiddleware.escrow);

// Request logging middleware (for development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Save Together API is running',
    timestamp: new Date().toISOString(),
  });
});

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/vendors', vendorsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/escrow', escrowRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/chat', chatRoutes);

// Initialize Socket.IO chat handlers
initializeChatSocket(io);

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
  });
});

// CSRF error handler
app.use(csrfErrorHandler);

// Timeout error handler
app.use(timeoutErrorHandler);

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err); // Log the full error stack in development

  // Handle specific error types
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      success: false,
      error: 'Invalid CSRF token',
    });
  }

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }), // Only expose stack in development
  });
});

// Start server
server.listen(PORT, () => {
  console.log('\n🚀 Save Together API Server');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`💬 Socket.IO initialized`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📚 Swagger Docs: http://localhost:${PORT}/api-docs`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// export default app; // Only if you intend to import 'app' elsewhere
