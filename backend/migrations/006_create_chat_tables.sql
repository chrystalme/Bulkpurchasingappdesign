-- Chat System Database Schema
-- This migration creates tables for the dual-stream chat system

-- Conversations table (group internal chats and group-vendor chats)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('group', 'group-vendor')),
    title VARCHAR(255) NOT NULL,
    avatar VARCHAR(100),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Only for group-vendor type
    product_id UUID REFERENCES products(id) ON DELETE SET NULL, -- Optional: product being discussed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure vendor_id is set for group-vendor conversations
    CONSTRAINT check_vendor_for_vendor_chat 
        CHECK ((type = 'group-vendor' AND vendor_id IS NOT NULL) OR type = 'group'),
    
    -- Unique constraint: one group can only have one internal chat
    CONSTRAINT unique_group_internal_chat 
        UNIQUE (group_id, type) 
        DEFERRABLE INITIALLY DEFERRED
    -- Unique constraint: one group-vendor pair can only have one conversation
    -- This will be created as a partial unique index after the table definition
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_group_vendor_chat_idx
    ON conversations (group_id, vendor_id)
    WHERE type = 'group-vendor';

-- Conversation participants
CREATE TABLE IF NOT EXISTS conversation_participants (
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
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false
);

-- Add indexes for messages table
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- Typing indicators (ephemeral, can be in-memory but stored for persistence)
CREATE TABLE IF NOT EXISTS typing_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    
    -- Unique constraint: one user can only be typing once in a conversation
    CONSTRAINT unique_typing_indicator UNIQUE (conversation_id, user_id)
);

-- Message read receipts
CREATE TABLE IF NOT EXISTS message_read_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint: one user can only read a message once
    CONSTRAINT unique_read_receipt UNIQUE (message_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_group ON conversations(group_id);
CREATE INDEX IF NOT EXISTS idx_conversations_vendor ON conversations(vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_conversation ON typing_indicators(conversation_id);
CREATE INDEX IF NOT EXISTS idx_typing_expires ON typing_indicators(expires_at);

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
