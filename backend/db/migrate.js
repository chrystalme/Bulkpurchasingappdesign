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

    const chatSchemaPath = path.join(
      __dirname,
      '../migrations/006_create_chat_tables.sql',
    );
    const chatSchema = fs.readFileSync(chatSchemaPath, 'utf8');

    const refreshTokensSchemaPath = path.join(
      __dirname,
      '../migrations/007_create_refresh_tokens.sql',
    );
    const refreshTokensSchema = fs.readFileSync(
      refreshTokensSchemaPath,
      'utf8',
    );

    const lastSeenToUsersSchemaPath = path.join(
      __dirname,
      '../migrations/008_add_last_seen_to_users.sql',
    );

    const lastSeenToUsersSchema = fs.readFileSync(
      lastSeenToUsersSchemaPath,
      'utf8',
    );

    const joinRequestsSchemaPath = path.join(
      __dirname,
      '../migrations/009_create_join_requests_table.sql',
    );
    const joinRequestsSchema = fs.readFileSync(joinRequestsSchemaPath, 'utf8');

    const phoneToUsersSchemaPath = path.join(
      __dirname,
      '../migrations/010_add_phone_to_users.sql',
    );
    const phoneToUsersSchema = fs.readFileSync(phoneToUsersSchemaPath, 'utf8');

    const groupCartSchemaPath = path.join(
      __dirname,
      '../migrations/011_create_group_cart_tables.sql',
    );
    const groupCartSchema = fs.readFileSync(groupCartSchemaPath, 'utf8');

    const directMessagesSchemaPath = path.join(
      __dirname,
      '../migrations/012_add_direct_messages.sql',
    );
    const directMessagesSchema = fs.readFileSync(directMessagesSchemaPath, 'utf8');

    const isReset = process.argv.includes('--reset');

    // Check if base schema has already been initialized
    const userTableCheck = await pool.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'"
    );
    const shouldRunBase = isReset || userTableCheck.rows.length === 0;

    if (shouldRunBase) {
      console.log('📦 Applying base schema...');
      await pool.query(schema);
    } else {
      console.log('ℹ️ Base schema already present, skipping destructive schema reset.');
    }

    const chatTableCheck = await pool.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations'"
    );
    const shouldRunChat = isReset || chatTableCheck.rows.length === 0;

    if (shouldRunChat) {
      console.log('💬 Applying chat schema...');
      await pool.query(chatSchema);
    } else {
      console.log('ℹ️ Chat schema already present, ensuring chat triggers are up to date.');
      await pool.query(`
        CREATE OR REPLACE FUNCTION add_member_to_vendor_chats()
        RETURNS TRIGGER AS $$
        BEGIN
            INSERT INTO conversation_participants (conversation_id, user_id, role, can_send)
            SELECT 
                c.id,
                NEW.user_id,
                CASE WHEN NEW.role = 'admin' THEN 'admin' ELSE 'member' END,
                (NEW.role = 'admin')
            FROM conversations c
            WHERE c.group_id = NEW.group_id 
              AND c.type = 'group-vendor'
              AND (c.vendor_id IS NULL OR c.vendor_id != NEW.user_id)
            ON CONFLICT (conversation_id, user_id) DO UPDATE
            SET role = EXCLUDED.role,
                can_send = EXCLUDED.can_send
            WHERE conversation_participants.role != 'vendor';

            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS add_to_vendor_chat_trigger ON group_members;
        CREATE TRIGGER add_to_vendor_chat_trigger
            AFTER INSERT OR UPDATE ON group_members
            FOR EACH ROW
            EXECUTE FUNCTION add_member_to_vendor_chats();

        CREATE OR REPLACE FUNCTION enroll_members_in_new_vendor_chat()
        RETURNS TRIGGER AS $$
        BEGIN
            IF NEW.type = 'group-vendor' THEN
                IF NEW.vendor_id IS NOT NULL THEN
                    INSERT INTO conversation_participants (conversation_id, user_id, role, can_send)
                    VALUES (NEW.id, NEW.vendor_id, 'vendor', true)
                    ON CONFLICT (conversation_id, user_id) DO UPDATE
                    SET role = 'vendor', can_send = true;
                END IF;

                INSERT INTO conversation_participants (conversation_id, user_id, role, can_send)
                SELECT 
                    NEW.id,
                    gm.user_id,
                    CASE WHEN gm.role = 'admin' THEN 'admin' ELSE 'member' END,
                    (gm.role = 'admin')
                FROM group_members gm
                WHERE gm.group_id = NEW.group_id
                  AND (NEW.vendor_id IS NULL OR gm.user_id != NEW.vendor_id)
                ON CONFLICT (conversation_id, user_id) DO UPDATE
                SET role = EXCLUDED.role,
                    can_send = EXCLUDED.can_send
                WHERE conversation_participants.role != 'vendor';
            END IF;

            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS enroll_members_in_new_vendor_chat_trigger ON conversations;
        CREATE TRIGGER enroll_members_in_new_vendor_chat_trigger
            AFTER INSERT ON conversations
            FOR EACH ROW
            EXECUTE FUNCTION enroll_members_in_new_vendor_chat();
      `);
    }

    // Execute the remaining incremental migrations
    await pool.query(refreshTokensSchema);
    await pool.query(lastSeenToUsersSchema);
    await pool.query(joinRequestsSchema);
    await pool.query(phoneToUsersSchema);
    await pool.query(groupCartSchema);
    await pool.query(directMessagesSchema);

    console.log('✅ Database migration completed successfully!');
    console.log('📊 All tables verified and up to date.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
