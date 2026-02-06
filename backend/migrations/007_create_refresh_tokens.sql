-- Migration 007: Create refresh tokens table
-- This table stores refresh tokens for JWT token rotation

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  revoked_reason VARCHAR(255),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_revoked_at ON refresh_tokens(revoked_at);

-- Index for finding valid tokens
CREATE INDEX idx_refresh_tokens_valid ON refresh_tokens(user_id, expires_at) 
WHERE revoked_at IS NULL;

-- Add columns to users table for token management
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_token_rotation TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_rotation_count INTEGER DEFAULT 0;

COMMENT ON TABLE refresh_tokens IS 'Stores refresh tokens for JWT token rotation and revocation';
COMMENT ON COLUMN refresh_tokens.token IS 'The actual refresh token (hashed in production)';
COMMENT ON COLUMN refresh_tokens.revoked_at IS 'Timestamp when token was revoked (NULL if still valid)';
COMMENT ON COLUMN refresh_tokens.ip_address IS 'IP address where token was issued';
COMMENT ON COLUMN refresh_tokens.user_agent IS 'User agent where token was issued';
