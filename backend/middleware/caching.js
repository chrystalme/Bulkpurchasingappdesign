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

  // Reads must reflect writes immediately: nothing here invalidates a cached
  // GET when a write lands, so a browser-served copy (previously 5-15 minutes)
  // hides every create/update/delete until it expires.
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
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
  // Products, vendors, orders, groups and escrow are all mutable and
  // auth-scoped: reads are never served from the browser cache so an edit,
  // create or delete is visible on the very next request.

  products: (req, res, next) => {
    if (req.method === 'GET') {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
      res.set('Cache-Control', 'no-cache, no-store');
    }
    next();
  },

  vendors: (req, res, next) => {
    if (req.method === 'GET') {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
      res.set('Cache-Control', 'no-cache, no-store');
    }
    next();
  },

  orders: (req, res, next) => {
    if (req.method === 'GET') {
      res.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    } else {
      res.set('Cache-Control', 'no-cache, no-store');
    }
    next();
  },

  groups: (req, res, next) => {
    if (req.method === 'GET') {
      res.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
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

  // No caching for escrow (mutable, user-specific state machine)
  escrow: (req, res, next) => {
    if (req.method === 'GET') {
      res.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    } else {
      res.set('Cache-Control', 'no-cache, no-store');
    }
    next();
  },
};

export default cacheMiddleware;
