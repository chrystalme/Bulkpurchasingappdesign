import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function resetDatabase() {
  try {
    console.log('🔄 Resetting database...\n');
    
    // Run migrations
    console.log('1️⃣ Running migrations...');
    await execAsync('node db/migrate.js');
    
    // Run seeds
    console.log('\n2️⃣ Seeding database...');
    await execAsync('node db/seed.js');
    
    console.log('\n✅ Database reset completed!');
  } catch (error) {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  }
}

resetDatabase();
