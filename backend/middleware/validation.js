import { body, param, query, validationResult } from 'express-validator';

// Password strength validator
export const validatePasswordStrength = () => {
  return body('password')
    .isLength({ min: 10 })
    .withMessage('Password must be at least 10 characters long')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)
    .withMessage(
      'Password must contain at least one special character (!@#$%^&*...)',
    );
};

// Email validator
export const validateEmail = (fieldName = 'email') => {
  return body(fieldName)
    .isEmail()
    .withMessage('Valid email address is required')
    .normalizeEmail()
    .trim();
};

// URL validator
export const validateURL = (fieldName = 'url') => {
  return body(fieldName).isURL().withMessage('Valid URL is required').trim();
};

// Phone number validator (basic format)
export const validatePhoneNumber = (fieldName = 'phone') => {
  return body(fieldName)
    .matches(/^[\d\-\+\(\)\s]{10,}$/)
    .withMessage('Valid phone number is required')
    .trim();
};

// String length validator
export const validateStringLength = (fieldName, min, max) => {
  return body(fieldName)
    .trim()
    .isLength({ min, max })
    .withMessage(`${fieldName} must be between ${min} and ${max} characters`);
};

// Numeric range validator
export const validateNumericRange = (fieldName, min, max) => {
  return body(fieldName)
    .isInt({ min, max })
    .withMessage(`${fieldName} must be between ${min} and ${max}`);
};

// Enum validator
export const validateEnum = (fieldName, allowedValues) => {
  return body(fieldName)
    .isIn(allowedValues)
    .withMessage(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
};

// Sanitize string input (remove dangerous characters)
export const sanitizeString = fieldName => {
  return body(fieldName)
    .trim()
    .escape()
    .isLength({ min: 1 })
    .withMessage(`${fieldName} is required`);
};

// Sanitize email
export const sanitizeEmail = (fieldName = 'email') => {
  return body(fieldName).normalizeEmail().isEmail();
};

// Validation rules for signup
export const signupValidationRules = () => {
  return [
    validateEmail('email'),
    body('email').custom(value => {
      if (value.length > 255) {
        throw new Error('Email is too long');
      }
      return true;
    }),
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters')
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage(
        'Name can only contain letters, spaces, hyphens, and apostrophes',
      ),
    validatePasswordStrength(),
    body('role')
      .optional()
      .isIn(['member', 'vendor'])
      .withMessage('role must be one of: member, vendor'),
  ];
};

// Validation rules for login
export const loginValidationRules = () => {
  return [
    validateEmail('email'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 1, max: 500 })
      .withMessage('Invalid password'),
  ];
};

// Validation rules for password change
export const passwordChangeValidationRules = () => {
  return [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    validatePasswordStrength(),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  ];
};

// Validation rules for product creation
export const productValidationRules = () => {
  return [
    body('name')
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage('Product name must be between 3 and 200 characters'),
    body('description')
      .trim()
      .isLength({ min: 10, max: 2000 })
      .withMessage(
        'Product description must be between 10 and 2000 characters',
      ),
    body('price')
      .isFloat({ min: 0.01, max: 999999 })
      .withMessage('Price must be a valid number between 0.01 and 999999'),
    body('category')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Category must be between 2 and 100 characters'),
    body('quantity')
      .isInt({ min: 1, max: 1000000 })
      .withMessage('Quantity must be an integer between 1 and 1000000'),
  ];
};

// Validation rules for chat messages
export const chatMessageValidationRules = () => {
  return [
    body('conversationId')
      .isUUID()
      .withMessage('Valid conversation ID is required'),
    body('content')
      .trim()
      .isLength({ min: 1, max: 5000 })
      .withMessage('Message must be between 1 and 5000 characters'),
  ];
};

// Validation rules for order submission
export const orderValidationRules = () => {
  return [
    body('items')
      .isArray({ min: 1 })
      .withMessage('At least one item is required'),
    body('items.*.productId')
      .isUUID()
      .withMessage('Valid product ID is required for each item'),
    body('items.*.quantity')
      .isInt({ min: 1, max: 1000000 })
      .withMessage('Quantity must be between 1 and 1000000 for each item'),
    body('items.*.price')
      .isFloat({ min: 0.01 })
      .withMessage('Valid price is required for each item'),
    body('shippingAddress')
      .isLength({ min: 10, max: 500 })
      .withMessage('Shipping address must be between 10 and 500 characters'),
    body('totalAmount')
      .isFloat({ min: 0.01 })
      .withMessage('Total amount must be a valid number'),
  ];
};

// Middleware to validate request and return errors
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      location: err.location,
      value: err.value,
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      message: 'Request validation failed. Check the errors array for details.',
      errors: formattedErrors,
    });
  }

  next();
};

// Middleware to log validation attempts
export const logValidationAttempts = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const logData = {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      path: req.path,
      method: req.method,
      errors: errors.array(),
      userId: req.user?.id,
    };
    console.log('[VALIDATION ERROR]', JSON.stringify(logData));
  }

  next();
};
