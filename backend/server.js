import express from 'express';
import http from 'http'; // For creating the HTTP server for Socket.IO
import { Server } from 'socket.io'; // For Socket.IO server
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import productsRoutes from './routes/products.routes.js';
import vendorsRoutes from './routes/vendors.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import escrowRoutes from './routes/escrow.routes.js';
// import groupRoutes from './routes/group.routes.js';
import chatRoutes from './routes/chat.routes.js';

// Import Socket.IO chat initializer
import { initializeChatSocket } from './socket/chat.socket.js';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app); // Create HTTP server for Express and Socket.IO
const PORT = process.env.PORT || 3000;

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods
    credentials: true,
  },
});

// Make io accessible to routes (if needed, though direct import in route files is often cleaner for ES Modules)
app.set('io', io);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json()); // Parses incoming requests with JSON payloads
app.use(express.urlencoded({ extended: true })); // Parses incoming requests with URL-encoded payloads

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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/vendors', vendorsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/escrow', escrowRoutes);
// app.use('/api/groups', groupRoutes);
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

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err); // Log the full error stack in development
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