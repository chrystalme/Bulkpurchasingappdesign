-- Migration 011: Create Group Cart Tables and Triggers

-- 1. Group Cart Items Table
CREATE TABLE IF NOT EXISTS group_cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_group_product UNIQUE (group_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_group_cart_items_group_id ON group_cart_items(group_id);
CREATE INDEX IF NOT EXISTS idx_group_cart_items_product_id ON group_cart_items(product_id);

-- 2. Member Allocations Table
CREATE TABLE IF NOT EXISTS group_cart_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_item_id UUID NOT NULL REFERENCES group_cart_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    paid BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_cart_item_user UNIQUE (cart_item_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_cart_allocations_item ON group_cart_allocations(cart_item_id);
CREATE INDEX IF NOT EXISTS idx_group_cart_allocations_user ON group_cart_allocations(user_id);

-- 3. Triggers: Auto-update updated_at timestamp on record modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_group_cart_items_updated_at ON group_cart_items;
CREATE TRIGGER update_group_cart_items_updated_at
    BEFORE UPDATE ON group_cart_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_group_cart_allocations_updated_at ON group_cart_allocations;
CREATE TRIGGER update_group_cart_allocations_updated_at
    BEFORE UPDATE ON group_cart_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
