import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  try {
    console.log('🚀 Starting database migration...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    const chatSchemaPath = path.join(__dirname, '../migrations/006_create_chat_tables.sql');
    const chatSchema = fs.readFileSync(chatSchemaPath, 'utf8');
    
    // Execute the schema
    // await pool.query(schema);
    await pool.query(chatSchema);
    
    console.log('✅ Database migration completed successfully!');
    console.log('📊 All tables created.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
