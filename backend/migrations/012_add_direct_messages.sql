-- 012: Add support for 1:1 direct messages between users.
-- Direct conversations reuse the conversations/conversation_participants tables:
--   - type gains 'direct'
--   - group_id becomes nullable (direct chats have no group)
--   - user_a / user_b hold the canonical sorted user pair (user_a < user_b)
--   - unique_direct_chat_idx guarantees one conversation per user pair

ALTER TABLE conversations
    DROP CONSTRAINT IF EXISTS conversations_type_check;
ALTER TABLE conversations
    ADD CONSTRAINT conversations_type_check
        CHECK (type IN ('group', 'group-vendor', 'direct'));

-- The vendor constraint must also accept direct conversations.
ALTER TABLE conversations
    DROP CONSTRAINT IF EXISTS check_vendor_for_vendor_chat;
ALTER TABLE conversations
    ADD CONSTRAINT check_vendor_for_vendor_chat
        CHECK ((type = 'group-vendor' AND vendor_id IS NOT NULL) OR type IN ('group', 'direct'));

ALTER TABLE conversations
    ALTER COLUMN group_id DROP NOT NULL;

ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS user_a UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS user_b UUID REFERENCES users(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS unique_direct_chat_idx
    ON conversations (user_a, user_b)
    WHERE type = 'direct';
