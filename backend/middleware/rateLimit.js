import rateLimit from 'express-rate-limit';

// Helper to get IPv4 address
const getIP = (req) => {
  return req.ip || 
    req.connection.remoteAddress || 
    req.socket.remoteAddress || 
    req.connection.socket?.remoteAddress ||
    'unknown';
};

// Login rate limiter - 20 attempts per 15 minutes per IP
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts, please try again after 15 minutes',
  statusCode: 429,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many login attempts, please try again after 15 minutes',
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

// Signup rate limiter - 10 attempts per 30 minutes per IP
export const signupLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 3,
  message: 'Too many signup attempts, please try again after 30 minutes',
  statusCode: 429,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many signup attempts, please try again after 30 minutes',
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

// Password reset rate limiter - 3 attempts per hour per IP
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Too many password reset attempts, please try again after 1 hour',
  statusCode: 429,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many password reset attempts, please try again after 1 hour',
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

// General API rate limiter - 100 requests per 15 minutes per IP
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later',
  statusCode: 429,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip health check endpoint
    return req.path === '/api/health';
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later',
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

// Chat messages rate limiter - 50 per minute per user
export const chatMessageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  message: 'Too many chat messages, please slow down',
  statusCode: 429,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise use IP
    return req.user?.id ? `user-${req.user.id}` : getIP(req);
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many chat messages, please slow down',
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

// File upload rate limiter - 10 per hour per user
export const fileUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many file uploads, please try again later',
  statusCode: 429,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise use IP
    return req.user?.id ? `user-${req.user.id}` : getIP(req);
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many file uploads, please try again later',
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

// Socket.IO rate limiter helper for chat events
export const createSocketRateLimiter = (windowMs, max) => {
  const store = new Map();

  return (socketId, callback) => {
    const now = Date.now();
    const userKey = `socket-${socketId}`;

    if (!store.has(userKey)) {
      store.set(userKey, []);
    }

    const timestamps = store.get(userKey);
    const recentTimestamps = timestamps.filter((ts) => now - ts < windowMs);

    if (recentTimestamps.length >= max) {
      callback(false);
      return;
    }

    recentTimestamps.push(now);
    store.set(userKey, recentTimestamps);
    callback(true);

    // Cleanup old entries periodically
    if (store.size > 10000) {
      for (const [key, times] of store.entries()) {
        const valid = times.filter((ts) => now - ts < windowMs);
        if (valid.length === 0) {
          store.delete(key);
        } else {
          store.set(key, valid);
        }
      }
    }
  };
};

// Socket chat message limiter - 50 per minute per user
export const socketChatMessageLimiter = createSocketRateLimiter(60 * 1000, 50);
