import dotenv from 'dotenv';
dotenv.config();

/**
 * Default allowed origins for frontend development and production.
 * Vite dev server runs on http://localhost:5173 by default.
 * Port 3000 is retained for backwards compatibility.
 */
export const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
];

/**
 * Returns an array of all allowed origins by combining defaults with any
 * environment variables (CORS_ORIGIN, CLIENT_URL).
 */
export function getAllowedOrigins() {
  const envOrigins = (process.env.CORS_ORIGIN || process.env.CLIENT_URL || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  return Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...envOrigins]));
}

/**
 * Express CORS middleware options.
 */
export const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    const allowed = getAllowedOrigins();
    if (allowed.includes(origin) || allowed.includes('*')) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'x-csrf-token',
    'Accept',
  ],
};

export default corsOptions;
