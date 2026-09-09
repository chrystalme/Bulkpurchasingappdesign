import DOMPurify from 'isomorphic-dompurify';

// Configure DOMPurify to allow safe HTML while removing scripts
const SANITIZER_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
  KEEP_CONTENT: true,
  FORCE_BODY: false,
  RETURN_TRUSTED_TYPE: false,
};

// Strict config for user inputs (no HTML allowed)
const STRICT_SANITIZER_CONFIG = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
  FORCE_BODY: false,
  RETURN_TRUSTED_TYPE: false,
};

/**
 * Sanitize HTML content, allowing safe tags but removing scripts
 * Use this for content that should allow some formatting (descriptions, rich text)
 */
export const sanitizeHTML = (dirty: string | null | undefined): string => {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, SANITIZER_CONFIG);
};

/**
 * Strictly sanitize user input - removes all HTML tags
 * Use this for user-generated text that should not contain any HTML (messages, titles, etc)
 */
export const sanitizeInput = (dirty: string | null | undefined): string => {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, STRICT_SANITIZER_CONFIG);
};

/**
 * Escape HTML special characters for safe text display
 * Use this for simple text that should be displayed as-is without HTML interpretation
 */
export const escapeHtml = (text: string | null | undefined): string => {
  if (!text) return '';
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength (min 8 chars, at least 1 uppercase, 1 number)
 */
export const isValidPassword = (password: string): boolean => {
  return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);
};

/**
 * Get password strength feedback
 */
export const getPasswordStrengthFeedback = (password: string): string[] => {
  const feedback: string[] = [];
  if (password.length < 8) feedback.push('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password)) feedback.push('Password must contain an uppercase letter');
  if (!/[a-z]/.test(password)) feedback.push('Password must contain a lowercase letter');
  if (!/[0-9]/.test(password)) feedback.push('Password must contain a number');
  if (!/[^a-zA-Z0-9]/.test(password)) feedback.push('Password must contain a special character');
  return feedback;
};

/**
 * Validate chat message input - allow text and basic punctuation
 */
export const validateChatMessage = (message: string): boolean => {
  if (!message || message.trim().length === 0) return false;
  if (message.length > 5000) return false;
  // Allow alphanumeric, spaces, and basic punctuation
  const validPattern = /^[a-zA-Z0-9\s.,!?;:'"()\-—–\n]*$/;
  return validPattern.test(message);
};

/**
 * Sanitize chat message by removing HTML and validating content
 */
export const sanitizeChatMessage = (message: string): string => {
  const sanitized = sanitizeInput(message);
  return sanitized.trim().substring(0, 5000);
};

/**
 * Validate search input - allow alphanumeric, spaces, hyphens
 */
export const validateSearchInput = (search: string): boolean => {
  if (!search) return true; // Empty search is valid
  if (search.length > 200) return false;
  const validPattern = /^[a-zA-Z0-9\s\-]*$/;
  return validPattern.test(search);
};

/**
 * Sanitize search input
 */
export const sanitizeSearchInput = (search: string): string => {
  if (!search) return '';
  return search
    .replace(/[^a-zA-Z0-9\s\-]/g, '')
    .trim()
    .substring(0, 200);
};

/**
 * Validate name field (letters, spaces, hyphens, apostrophes)
 */
export const validateNameField = (name: string): boolean => {
  if (!name || name.length === 0) return false;
  if (name.length > 100) return false;
  const validPattern = /^[a-zA-Z\s\-']*$/;
  return validPattern.test(name);
};

/**
 * Sanitize name field
 */
export const sanitizeNameField = (name: string): string => {
  if (!name) return '';
  return name
    .replace(/[^a-zA-Z\s\-']/g, '')
    .trim()
    .substring(0, 100);
};
