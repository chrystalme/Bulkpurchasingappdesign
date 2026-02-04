-- Migration 006: Add Group-Based Chat System
-- This enhances the existing chat system with group internal and group-vendor chats
-- while preserving the existing member-vendor direct chat functionality

-- ============================================
-- 1. UPDATE CONVERSATIONS TABLE
-- ============================================

-- Add new columns to existing conversations table
ALTER TABLE IF EXISTS conversations 
  ADD COLUMN IF NOT EXISTS conversation_type VARCHAR(20) DEFAULT 'direct' 
    CHECK (conversation_type IN ('direct', 'group-internal', 'group-vendor'));

ALTER TABLE IF EXISTS conversations
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS conversations
  ADD COLUMN IF NOT EXISTS title VARCHAR(255);

ALTER TABLE IF EXISTS conversations
  ADD COLUMN IF NOT EXISTS avatar VARCHAR(100);

-- Add index for group lookups
CREATE INDEX IF NOT EXISTS idx_conversations_group_id ON conversations(group_id);

-- ============================================
-- 2. CREATE GROUP_CONVERSATION_PARTICIPANTS TABLE
-- ============================================

-- Track who can participate in group conversations
CREATE TABLE IF NOT EXISTS group_conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'member', 'vendor')),
    can_send BOOLEAN DEFAULT true,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint: one user per conversation
    CONSTRAINT unique_user_per_group_conversation UNIQUE (conversation_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_conv_participants_conversation 
  ON group_conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_group_conv_participants_user 
  ON group_conversation_participants(user_id);

-- ============================================
-- 3. TYPING INDICATORS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS typing_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    
    -- Unique constraint: one typing indicator per user per conversation
    CONSTRAINT unique_typing_indicator UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_typing_conversation ON typing_indicators(conversation_id);
CREATE INDEX IF NOT EXISTS idx_typing_expires ON typing_indicators(expires_at);

-- ============================================
-- 4. TRIGGERS FOR AUTO-CREATING GROUP CHATS
-- ============================================

-- Function to create group internal chat when group is created
CREATE OR REPLACE FUNCTION create_group_internal_chat()
RETURNS TRIGGER AS $$
DECLARE
    conversation_id UUID;
BEGIN
    -- Create internal chat conversation for the new group
    INSERT INTO conversations (conversation_type, title, group_id, avatar, status)
    VALUES ('group-internal', NEW.name || ' - Internal Chat', NEW.id, '💬', 'active')
    RETURNING id INTO conversation_id;
    
    -- Add group creator as admin participant
    INSERT INTO group_conversation_participants (conversation_id, user_id, role, can_send)
    VALUES (conversation_id, NEW.created_by, 'admin', true);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS create_group_chat_trigger ON groups;
CREATE TRIGGER create_group_chat_trigger
    AFTER INSERT ON groups
    FOR EACH ROW
    EXECUTE FUNCTION create_group_internal_chat();

-- Function to add new group members to internal chat
CREATE OR REPLACE FUNCTION add_member_to_group_chat()
RETURNS TRIGGER AS $$
DECLARE
    internal_conversation_id UUID;
    member_role VARCHAR(20);
BEGIN
    -- Find the internal chat conversation for this group
    SELECT id INTO internal_conversation_id
    FROM conversations
    WHERE group_id = NEW.group_id AND conversation_type = 'group-internal'
    LIMIT 1;
    
    -- Determine role
    IF NEW.role = 'admin' THEN
        member_role := 'admin';
    ELSE
        member_role := 'member';
    END IF;
    
    -- Add user to conversation participants
    INSERT INTO group_conversation_participants (conversation_id, user_id, role, can_send)
    VALUES (internal_conversation_id, NEW.user_id, member_role, true)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS add_to_group_chat_trigger ON group_members;
CREATE TRIGGER add_to_group_chat_trigger
    AFTER INSERT ON group_members
    FOR EACH ROW
    EXECUTE FUNCTION add_member_to_group_chat();

-- ============================================
-- 5. CLEANUP FUNCTION FOR EXPIRED TYPING INDICATORS
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_expired_typing_indicators()
RETURNS void AS $$
BEGIN
    DELETE FROM typing_indicators WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. VIEW FOR UNREAD COUNTS PER USER
-- ============================================

CREATE OR REPLACE VIEW unread_message_counts AS
SELECT 
    u.id as user_id,
    c.id as conversation_id,
    c.conversation_type,
    COUNT(m.id) as unread_count
FROM users u
CROSS JOIN conversations c
LEFT JOIN group_conversation_participants gcp ON gcp.conversation_id = c.id AND gcp.user_id = u.id
LEFT JOIN messages m ON m.conversation_id = c.id 
    AND m.sender_id != u.id
    AND m.is_read = false
    AND (
        -- For group conversations, user must be participant
        (c.conversation_type IN ('group-internal', 'group-vendor') AND gcp.user_id IS NOT NULL AND m.created_at > gcp.last_read_at)
        OR
        -- For direct conversations, user must be vendor or member
        (c.conversation_type = 'direct' AND (c.vendor_id = u.id OR c.member_id = u.id))
    )
WHERE c.status = 'active'
GROUP BY u.id, c.id, c.conversation_type;

-- ============================================
-- 7. UPDATE EXISTING DATA (BACKFILL)
-- ============================================

-- Set conversation_type for existing conversations
UPDATE conversations 
SET conversation_type = 'direct' 
WHERE conversation_type IS NULL;

-- Set default title for existing direct conversations
UPDATE conversations c
SET title = COALESCE(
    (SELECT u.name FROM users u WHERE u.id = c.vendor_id),
    'Chat'
)
WHERE conversation_type = 'direct' AND title IS NULL;

-- ============================================
-- 8. CREATE INTERNAL CHATS FOR EXISTING GROUPS
-- ============================================

-- Create internal chats for existing groups that don't have one
INSERT INTO conversations (conversation_type, title, group_id, avatar, status, created_at)
SELECT 
    'group-internal',
    g.name || ' - Internal Chat',
    g.id,
    '💬',
    'active',
    CURRENT_TIMESTAMP
FROM groups g
WHERE NOT EXISTS (
    SELECT 1 FROM conversations c 
    WHERE c.group_id = g.id AND c.conversation_type = 'group-internal'
);

-- Add all existing group members to their group internal chats
INSERT INTO group_conversation_participants (conversation_id, user_id, role, can_send)
SELECT 
    c.id as conversation_id,
    gm.user_id,
    gm.role,
    true as can_send
FROM conversations c
JOIN groups g ON c.group_id = g.id
JOIN group_members gm ON g.id = gm.group_id
WHERE c.conversation_type = 'group-internal'
ON CONFLICT (conversation_id, user_id) DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE group_conversation_participants IS 'Tracks participants in group-based conversations';
COMMENT ON TABLE typing_indicators IS 'Real-time typing indicators (ephemeral data)';
COMMENT ON COLUMN conversations.conversation_type IS 'Type: direct (1-1), group-internal (all members), group-vendor (admin to vendor)';
COMMENT ON COLUMN conversations.group_id IS 'Group ID for group-based conversations';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 006 completed successfully!';
    RAISE NOTICE '📊 Added group chat functionality';
    RAISE NOTICE '🔧 Created triggers for auto-chat creation';
    RAISE NOTICE '📈 Created views for unread counts';
    RAISE NOTICE '🎉 Backfilled data for existing groups';
END $$;
