import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'dev123',
  database: process.env.DB_NAME || 'save_together',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  // Generous connection timeout: tight values make queries fail during
  // transient post-sleep / post-restart reconnects (laptop sleep, PG
  // restart) instead of automatically retrying on a fresh connection.
  connectionTimeoutMillis: 10000,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  // Log and recover — never take down the whole API on a transient idle
  // connection drop (laptop sleep, PG restart). node-pg reconnects on the
  // next query from the pool automatically.
  console.error('❌ PostgreSQL idle client error (reconnecting on next query):', err.message || err);
});

export default pool;
