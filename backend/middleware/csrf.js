import csrf from 'csurf';

// Create CSRF protection middleware
const csrfProtection = csrf({ cookie: false });

// Middleware to generate and attach CSRF token
export const generateCSRFToken = (req, res, next) => {
  // Generate token and attach to response locals
  res.locals.csrfToken = req.csrfToken();
  next();
};

// Middleware to validate CSRF token on state-changing requests
export const validateCSRFToken = csrfProtection;

// Error handler for CSRF errors
export const csrfErrorHandler = (err, req, res, next) => {
  if (err.code !== 'EBADCSRFTOKEN') {
    return next(err);
  }

  // CSRF token errors
  res.status(403).json({
    success: false,
    error: 'Invalid CSRF token',
    message: 'Your session has expired. Please refresh and try again.',
  });
};

// Middleware to attach CSRF token to requests
export const attachCSRFToken = csrfProtection;

// Utility to validate CSRF for API requests
export const validateCSRFForAPI = (req, res, next) => {
  // Extract token from header or body
  const token = req.headers['x-csrf-token'] || req.body._csrf;

  if (!token) {
    return res.status(403).json({
      success: false,
      error: 'CSRF token required',
    });
  }

  // Validate token
  csrfProtection(req, res, (err) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid CSRF token',
      });
    }
    next();
  });
};

export default csrfProtection;
