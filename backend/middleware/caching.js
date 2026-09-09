import crypto from 'crypto';

/**
 * HTTP Caching Middleware
 * Sets appropriate Cache-Control headers based on content type
 */

export const cacheMiddleware = (req, res, next) => {
  // Don't cache for auth endpoints
  if (req.path.includes('/auth')) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    return next();
  }

  // Don't cache for chat (real-time data)
  if (req.path.includes('/chat')) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    return next();
  }

  // Don't cache for POST/PUT/DELETE
  if (req.method !== 'GET') {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    return next();
  }

  // Cache GET requests for 5 minutes
  res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
  res.set('Vary', 'Accept-Encoding');

  next();
};

/**
 * ETag middleware for cache validation
 * Generates ETag for response and handles If-None-Match
 */
export const etagMiddleware = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = function (data) {
    const stringData = JSON.stringify(data);
    const hash = crypto
      .createHash('md5')
      .update(stringData)
      .digest('hex');

    res.set('ETag', `"${hash}"`);

    // Check If-None-Match
    const ifNoneMatch = req.get('If-None-Match');
    if (ifNoneMatch === `"${hash}"`) {
      return res.status(304).end();
    }

    return originalJson(data);
  };

  next();
};

/**
 * Static asset caching (1 year)
 * Apply to /public routes
 */
export const staticCacheMiddleware = (req, res, next) => {
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/)) {
    res.set('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year
  }
  next();
};

/**
 * API response caching by endpoint
 * More fine-grained control over specific endpoints
 */
export const apiCacheMiddleware = {
  // Cache products for 10 minutes (they don't change often)
  products: (req, res, next) => {
    if (req.method === 'GET') {
      res.set('Cache-Control', 'public, max-age=600'); // 10 minutes
    } else {
      res.set('Cache-Control', 'no-cache, no-store');
    }
    next();
  },

  // Cache vendors for 15 minutes
  vendors: (req, res, next) => {
    if (req.method === 'GET') {
      res.set('Cache-Control', 'public, max-age=900'); // 15 minutes
    } else {
      res.set('Cache-Control', 'no-cache, no-store');
    }
    next();
  },

  // Cache orders for 5 minutes (user-specific)
  orders: (req, res, next) => {
    if (req.method === 'GET') {
      res.set('Cache-Control', 'private, max-age=300'); // 5 minutes, private
    } else {
      res.set('Cache-Control', 'no-cache, no-store');
    }
    next();
  },

  // Cache groups for 5 minutes
  groups: (req, res, next) => {
    if (req.method === 'GET') {
      res.set('Cache-Control', 'private, max-age=300'); // 5 minutes, private
    } else {
      res.set('Cache-Control', 'no-cache, no-store');
    }
    next();
  },

  // No caching for chat (real-time)
  chat: (req, res, next) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    next();
  },

  // No caching for auth
  auth: (req, res, next) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    next();
  },

  // No caching for users (sensitive)
  users: (req, res, next) => {
    res.set('Cache-Control', 'private, no-cache, no-store');
    next();
  },

  // Cache escrow for 5 minutes
  escrow: (req, res, next) => {
    if (req.method === 'GET') {
      res.set('Cache-Control', 'private, max-age=300');
    } else {
      res.set('Cache-Control', 'no-cache, no-store');
    }
    next();
  },
};

export default cacheMiddleware;
