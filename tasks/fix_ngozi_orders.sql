-- Bring the live database in line with the updated seed for Ngozi:
-- ORD-004 / order item / ESC-004 so her Orders & Escrow screens have data.
-- Idempotent: skips when ORD-004 already exists.
BEGIN;

DO $$
DECLARE
  v_ngozi     UUID := (SELECT id FROM users WHERE email = 'ngozi@example.com');
  v_grocery   UUID := (SELECT id FROM groups WHERE name = 'Neighborhood Grocery');
  v_olive     UUID := (SELECT id FROM products WHERE name = 'Olive Oil Extra Virgin (5L)');
  v_powercell UUID := (SELECT id FROM users WHERE email = 'vendor@powercell.com');
  v_order_id  UUID;
BEGIN
  IF v_ngozi IS NULL THEN
    RAISE EXCEPTION 'Ngozi user not found; run npm run reset instead';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM orders WHERE order_number = 'ORD-004') THEN
    INSERT INTO orders (order_number, group_id, buyer_id, status, total_amount, estimated_delivery)
    VALUES ('ORD-004', v_grocery, v_ngozi, 'shipped', 77.98, NOW() + INTERVAL '6 days')
    RETURNING id INTO v_order_id;

    INSERT INTO order_items (order_id, product_id, quantity, price)
    VALUES (v_order_id, v_olive, 2, 38.99);

    INSERT INTO escrow_transactions
      (transaction_number, order_id, buyer_id, seller_id, amount, escrow_fee, status,
       paid_at, shipped_at, delivered_at, inspection_deadline, auto_release_at, tracking_id, courier)
    VALUES
      ('ESC-004', v_order_id, v_ngozi, v_powercell, 77.98, 2.34, 'pending_inspection',
       NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', NULL,
       NOW() + INTERVAL '4 days', NOW() + INTERVAL '4 days', 'TRK-7777888999', 'QuickDeliver Co.');

    RAISE NOTICE 'Inserted ORD-004 for Ngozi';
  ELSE
    RAISE NOTICE 'ORD-004 already present; nothing to do';
  END IF;
END $$;

COMMIT;