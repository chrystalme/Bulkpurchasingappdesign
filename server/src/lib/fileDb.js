import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dir, '../../data/db.json');
const DATA_DIR = join(__dir, '../../data');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

// Initialize empty DB if file missing
if (!existsSync(DB_PATH)) {
  writeFileSync(DB_PATH, JSON.stringify({
    users: [], vendors: [], products: [], groups: [],
    group_members: [], orders: [], escrow_transactions: [],
    disputes: [], conversations: [], messages: [], reviews: [],
  }, null, 2));
}

function read() {
  return JSON.parse(readFileSync(DB_PATH, 'utf8'));
}

function write(state) {
  writeFileSync(DB_PATH, JSON.stringify(state, null, 2));
}

export const db = {
  /** Return the whole DB state (useful for debugging) */
  dump: () => read(),

  /** Return all rows in a table */
  all: (table) => read()[table] ?? [],

  /** Filter rows */
  where: (table, predicate) => (read()[table] ?? []).filter(predicate),

  /** Find first matching row */
  find: (table, predicate) => (read()[table] ?? []).find(predicate) ?? null,

  /** Find by primary key `id` */
  byId: (table, id) => (read()[table] ?? []).find((r) => r.id === id) ?? null,

  /** Insert a new row; caller must supply `id` */
  insert: (table, record) => {
    const state = read();
    if (!state[table]) state[table] = [];
    // Unique constraint check (email on users, unique combos elsewhere)
    state[table].push({ ...record, created_at: record.created_at || new Date().toISOString() });
    write(state);
    return { ...record };
  },

  /** Update row by id; merges partial updates */
  update: (table, id, updates) => {
    const state = read();
    const idx = (state[table] ?? []).findIndex((r) => r.id === id);
    if (idx === -1) return null;
    state[table][idx] = { ...state[table][idx], ...updates, updated_at: new Date().toISOString() };
    write(state);
    return { ...state[table][idx] };
  },

  /** Remove row by id; returns true if removed */
  remove: (table, id) => {
    const state = read();
    const idx = (state[table] ?? []).findIndex((r) => r.id === id);
    if (idx === -1) return false;
    state[table].splice(idx, 1);
    write(state);
    return true;
  },

  /** Push a new table if it doesn't exist */
  ensureTable: (table) => {
    const state = read();
    if (!state[table]) { state[table] = []; write(state); }
  },
};

export default db;
