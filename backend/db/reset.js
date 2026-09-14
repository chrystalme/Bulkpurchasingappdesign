import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function resetDatabase() {
  try {
    console.log('🔄 Resetting database...\n');
    console.log('⚠️  This will DROP all tables and reload from scratch!\n');

    // Run migrations with --reset to ensure a fresh clean schema
    console.log('1️⃣ Dropping all existing tables...');
    console.log('2️⃣ Creating fresh database schema...');
    await execAsync('node db/migrate.js --reset');

    // Run seeds
    console.log('\n3️⃣ Seeding database with test data...');
    await execAsync('node db/seed.js');
    console.log('\n✅ Database reset completed successfully!');
    console.log('✨ All tables dropped and recreated with fresh data.\n');
  } catch (error) {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  }
}

resetDatabase();
