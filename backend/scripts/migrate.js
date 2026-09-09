import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting chat system migration...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/006_create_chat_tables.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Running migration: 006_create_chat_tables.sql');

    // Execute the migration
    await client.query(sql);

    console.log('\n✅ Migration completed successfully!\n');

    // Verify tables created
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('conversations', 'conversation_participants', 'messages', 'typing_indicators', 'message_read_receipts')
      ORDER BY table_name
    `);

    console.log('📊 Tables created:');
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // Check triggers
    const triggers = await client.query(`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE trigger_name LIKE '%chat%'
    `);

    console.log('\n🔧 Triggers created:');
    triggers.rows.forEach(row => {
      console.log(`   ✓ ${row.trigger_name}`);
    });

    // Check views
    const views = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
        AND table_name LIKE '%conversation%'
    `);

    console.log('\n👁️  Views created:');
    views.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    console.log('\n🎉 Chat system is ready to use!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration();
