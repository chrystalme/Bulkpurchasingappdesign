-- Chat System Database Schema
-- This migration creates tables for the dual-stream chat system

-- Drop tables if they exist (for clean reset)
DROP TABLE IF EXISTS message_read_receipts CASCADE;
DROP TABLE IF EXISTS typing_indicators CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- Conversations table (group internal chats, group-vendor chats, and 1:1 direct messages)
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('group', 'group-vendor', 'direct')),
    title VARCHAR(255) NOT NULL,
    avatar VARCHAR(100),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE, -- NULL for direct messages
    vendor_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Only for group-vendor type
    product_id UUID REFERENCES products(id) ON DELETE SET NULL, -- Optional: product being discussed
    user_a UUID REFERENCES users(id) ON DELETE CASCADE, -- Only for direct type (canonical pair, user_a < user_b)
    user_b UUID REFERENCES users(id) ON DELETE CASCADE, -- Only for direct type (canonical pair)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure vendor_id is set for group-vendor conversations
    CONSTRAINT check_vendor_for_vendor_chat 
        CHECK ((type = 'group-vendor' AND vendor_id IS NOT NULL) OR type IN ('group', 'direct')),
    
    -- Unique constraint: one group can only have one internal chat
    CONSTRAINT unique_group_internal_chat 
        UNIQUE (group_id, type) 
        DEFERRABLE INITIALLY DEFERRED
    -- Unique constraint: one group-vendor pair can only have one conversation
    -- This will be created as a partial unique index after the table definition
);

CREATE UNIQUE INDEX unique_group_vendor_chat_idx
    ON conversations (group_id, vendor_id)
    WHERE type = 'group-vendor';

-- One direct conversation per user pair (user_a/user_b are the canonical sorted pair)
CREATE UNIQUE INDEX unique_direct_chat_idx
    ON conversations (user_a, user_b)
    WHERE type = 'direct';

-- Conversation participants
CREATE TABLE conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'member', 'vendor')),
    can_send BOOLEAN DEFAULT true,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint: one user can only be in a conversation once
    CONSTRAINT unique_user_per_conversation UNIQUE (conversation_id, user_id)
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false
);

-- Add indexes for messages table
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- Typing indicators (ephemeral, can be in-memory but stored for persistence)
CREATE TABLE typing_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    
    -- Unique constraint: one user can only be typing once in a conversation
    CONSTRAINT unique_typing_indicator UNIQUE (conversation_id, user_id)
);

-- Message read receipts
CREATE TABLE message_read_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint: one user can only read a message once
    CONSTRAINT unique_read_receipt UNIQUE (message_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_conversations_group ON conversations(group_id);
CREATE INDEX idx_conversations_vendor ON conversations(vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_typing_indicators_conversation ON typing_indicators(conversation_id);
CREATE INDEX idx_typing_expires ON typing_indicators(expires_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON conversations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at 
    BEFORE UPDATE ON messages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create group internal chat when group is created
CREATE OR REPLACE FUNCTION create_group_internal_chat()
RETURNS TRIGGER AS $$
DECLARE
    conversation_id UUID;
BEGIN
    -- Create internal chat conversation for the new group
    INSERT INTO conversations (type, title, group_id, avatar)
    VALUES ('group', NEW.name || ' - Internal Chat', NEW.id, '💬')
    RETURNING id INTO conversation_id;
    
    -- Add group creator as admin participant
    INSERT INTO conversation_participants (conversation_id, user_id, role, can_send)
    VALUES (conversation_id, NEW.created_by, 'admin', true);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create internal chat when group is created
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
    WHERE group_id = NEW.group_id AND type = 'group'
    LIMIT 1;
    
    -- Determine role (first member is admin, others are members)
    IF NEW.role = 'admin' THEN
        member_role := 'admin';
    ELSE
        member_role := 'member';
    END IF;
    
    -- Add user to conversation participants
    INSERT INTO conversation_participants (conversation_id, user_id, role, can_send)
    VALUES (internal_conversation_id, NEW.user_id, member_role, true)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-add members to internal chat
CREATE TRIGGER add_to_group_chat_trigger
    AFTER INSERT ON group_members
    FOR EACH ROW
    EXECUTE FUNCTION add_member_to_group_chat();

-- Function and trigger to auto-add members to group-vendor chats
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

-- Function and trigger to auto-enroll group members and vendor when group-vendor chat is created
CREATE OR REPLACE FUNCTION enroll_members_in_new_vendor_chat()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'group-vendor' THEN
        -- Enroll vendor with can_send = true
        IF NEW.vendor_id IS NOT NULL THEN
            INSERT INTO conversation_participants (conversation_id, user_id, role, can_send)
            VALUES (NEW.id, NEW.vendor_id, 'vendor', true)
            ON CONFLICT (conversation_id, user_id) DO UPDATE
            SET role = 'vendor', can_send = true;
        END IF;

        -- Enroll all current group_members with can_send = (role = 'admin'), excluding the vendor
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

-- Function to clean up expired typing indicators (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_typing_indicators()
RETURNS void AS $$
BEGIN
    DELETE FROM typing_indicators WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- View for conversation list with unread counts and last message
CREATE OR REPLACE VIEW conversation_list_view AS
SELECT 
    c.id,
    c.type,
    c.title,
    c.avatar,
    c.group_id,
    c.vendor_id,
    c.product_id,
    c.created_at,
    c.updated_at,
    g.name as group_name,
    vendor.name as vendor_name,
    vendor.avatar as vendor_avatar,
    -- Last message
    (
        SELECT json_build_object(
            'id', m.id,
            'content', m.content,
            'senderId', m.sender_id,
            'senderName', u.name,
            'senderAvatar', u.avatar,
            'timestamp', m.created_at
        )
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = c.id AND m.is_deleted = false
        ORDER BY m.created_at DESC
        LIMIT 1
    ) as last_message,
    -- Vendor online status (if vendor conversation)
    CASE 
        WHEN c.type = 'group-vendor' THEN vendor.is_online
        ELSE false
    END as is_vendor_online
FROM conversations c
LEFT JOIN groups g ON c.group_id = g.id
LEFT JOIN users vendor ON c.vendor_id = vendor.id;

-- View for unread message counts per user per conversation
CREATE OR REPLACE VIEW unread_counts_view AS
SELECT 
    cp.conversation_id,
    cp.user_id,
    COUNT(m.id) as unread_count
FROM conversation_participants cp
LEFT JOIN messages m ON m.conversation_id = cp.conversation_id 
    AND m.created_at > cp.last_read_at
    AND m.sender_id != cp.user_id
    AND m.is_deleted = false
GROUP BY cp.conversation_id, cp.user_id;

COMMENT ON TABLE conversations IS 'Stores all chat conversations (group internal and group-vendor)';
COMMENT ON TABLE conversation_participants IS 'Tracks who can participate in each conversation and their permissions';
COMMENT ON TABLE messages IS 'All chat messages across all conversations';
COMMENT ON TABLE typing_indicators IS 'Real-time typing indicators (ephemeral data)';
COMMENT ON TABLE message_read_receipts IS 'Individual message read receipts';
