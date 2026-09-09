-- Add phone column to users table for notifications
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
