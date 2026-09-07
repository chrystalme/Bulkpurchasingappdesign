import bcrypt from 'bcrypt';
import pool from '../config/database.js';

async function seedDatabase() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🌱 Starting database seeding...');
    
    // 1. Create Vendors
    console.log('📦 Seeding vendors...');
    const vendorsResult = await client.query(`
      INSERT INTO vendors (name, rating, location, image, verified)
      VALUES 
        ('Fresh Farm Collective', 4.8, '2.3 km away', 'https://api.dicebear.com/7.x/initials/svg?seed=FFC', true),
        ('Tech Wholesale Hub', 4.6, '5.1 km away', 'https://api.dicebear.com/7.x/initials/svg?seed=TWH', true),
        ('Office Essentials Plus', 4.9, '1.8 km away', 'https://api.dicebear.com/7.x/initials/svg?seed=OEP', true),
        ('PowerCell Solutions', 4.7, '3.5 km away', 'https://api.dicebear.com/7.x/initials/svg?seed=PCS', true),
        ('SolarTech Distributors', 4.9, '4.0 km away', 'https://api.dicebear.com/7.x/initials/svg?seed=STD', true),
        ('Industrial Supplies Co.', 4.8, '6.0 km away', 'https://api.dicebear.com/7.x/initials/svg?seed=ISC', true)
      RETURNING id
    `);
    console.log(`✅ Created ${vendorsResult.rowCount} vendors`);
    
    // 2. Create Users
    console.log('👥 Seeding users...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const usersResult = await client.query(`
      INSERT INTO users (email, password_hash, name, role, avatar, vendor_id, trust_score)
      VALUES 
        ('super@admin.com', $1, 'Super User', 'superUser', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Super', NULL, NULL),
        ('admin@savetogether.com', $1, 'Admin User', 'admin', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin', NULL, NULL),
        ('vendor@solartech.com', $1, 'SolarTech Distributors', 'vendor', 'https://api.dicebear.com/7.x/initials/svg?seed=STD', 5, NULL),
        ('vendor@powercell.com', $1, 'PowerCell Solutions', 'vendor', 'https://api.dicebear.com/7.x/initials/svg?seed=PCS', 4, NULL),
        ('vendor@freshfarm.com', $1, 'Fresh Farm Collective', 'vendor', 'https://api.dicebear.com/7.x/initials/svg?seed=FFC', 1, NULL),
        ('vendor@techwholesale.com', $1, 'Tech Wholesale Hub', 'vendor', 'https://api.dicebear.com/7.x/initials/svg?seed=TWH', 2, NULL),
        ('afam@example.com', $1, 'Afam', 'member', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Afam', NULL, 92),
        ('chioma@example.com', $1, 'Chioma', 'member', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Chioma', NULL, 88),
        ('eze@example.com', $1, 'Eze', 'member', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eze', NULL, 95),
        ('ngozi@example.com', $1, 'Ngozi', 'member', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ngozi', NULL, 85)
      RETURNING id
    `, [hashedPassword]);
    console.log(`✅ Created ${usersResult.rowCount} users (password: password123)`);
    
    // 3. Create Products
    console.log('🛍️ Seeding products...');
    const productsResult = await client.query(`
      INSERT INTO products (name, image, bulk_price, retail_price, moq, vendor_id, category)
      VALUES 
        -- Fresh Farm Collective products
        ('Premium Organic Rice (25kg)', 'rice-bag', 45.99, 65.99, 10, 1, 'Groceries'),
        ('Olive Oil Extra Virgin (5L)', 'olive-oil', 38.99, 54.99, 6, 1, 'Groceries'),
        
        -- Tech Wholesale Hub products
        ('LED Light Bulbs (Pack of 24)', 'lightbulbs', 28.99, 42.99, 5, 2, 'Electronics'),
        ('USB-C Charging Cables (20 pack)', 'usb-cables', 42.99, 65.99, 4, 2, 'Electronics'),
        ('Wireless Security Camera (Pack of 4)', 'camera', 199.99, 299.99, 5, 2, 'Electronics'),
        ('Smart LED Bulbs RGB (Pack of 12)', 'smart-bulb', 89.99, 129.99, 6, 2, 'Electronics'),
        ('Bluetooth Speakers Waterproof (Pack of 8)', 'speaker', 159.99, 239.99, 4, 2, 'Electronics'),
        
        -- Office Essentials Plus products
        ('Premium Copy Paper (10 reams)', 'paper', 35.99, 52.99, 8, 3, 'Office Supplies'),
        ('Multipurpose Printer Paper A4', 'printer-paper', 29.99, 44.99, 10, 3, 'Office Supplies'),
        
        -- PowerCell Solutions products
        ('Lithium-Ion Battery 18650 (Pack of 4)', 'battery', 24.99, 38.99, 5, 4, 'Batteries'),
        ('LiFePO4 12V 100Ah Battery', 'battery', 289.99, 399.99, 3, 4, 'Batteries'),
        ('Portable Power Bank 20000mAh (Pack of 10)', 'powerbank', 149.99, 229.99, 4, 4, 'Batteries'),
        ('Rechargeable Drill Battery 20V (Pack of 8)', 'drill-battery', 219.99, 319.99, 3, 4, 'Batteries'),
        
        -- SolarTech Distributors products
        ('Monocrystalline Solar Panel 300W', 'solar-panel', 175.99, 249.99, 5, 5, 'Solar Energy'),
        ('Solar Inverter 3000W Pure Sine Wave', 'inverter', 425.99, 599.99, 3, 5, 'Solar Energy'),
        ('Solar Charge Controller MPPT 60A', 'controller', 89.99, 129.99, 6, 5, 'Solar Energy'),
        ('Solar LED Street Light 100W (Pack of 5)', 'street-light', 349.99, 499.99, 4, 5, 'Solar Energy'),
        ('Portable Solar Generator 500Wh', 'solar-generator', 399.99, 549.99, 3, 5, 'Solar Energy'),
        
        -- Industrial Supplies Co. products
        ('Heavy Duty Extension Cords 50ft (Pack of 10)', 'extension-cord', 124.99, 179.99, 5, 6, 'Industrial'),
        ('LED Work Lights 50W (Pack of 6)', 'work-light', 139.99, 199.99, 4, 6, 'Industrial')
      RETURNING id
    `);
    console.log(`✅ Created ${productsResult.rowCount} products`);
    
    // 4. Create Groups
    console.log('👨‍👩‍👧‍👦 Seeding groups...');
    const groupsResult = await client.query(`
      INSERT INTO groups (name, description, join_code, moq_target, current_quantity, status)
      VALUES 
        ('Office Supplies Squad', 'Bulk buying for our co-working space', 'OFFICE2024', 100, 75, 'active'),
        ('Neighborhood Grocery', 'Fresh produce and pantry staples', 'GROCERY123', 50, 20, 'active'),
        ('Tech Accessories', 'Phone cases, chargers, and cables', 'TECH456', 30, 27, 'pending')
      RETURNING id
    `);
    console.log(`✅ Created ${groupsResult.rowCount} groups`);
    
    // 5. Add group members
    console.log('🤝 Adding group members...');
    await client.query(`
      INSERT INTO group_members (group_id, user_id)
      VALUES 
        (1, 7), (1, 8), (1, 9),
        (2, 7), (2, 8), (2, 9), (2, 10),
        (3, 7), (3, 8)
    `);
    console.log('✅ Added group members');
    
    // 6. Create sample orders
    console.log('📋 Seeding orders...');
    const ordersResult = await client.query(`
      INSERT INTO orders (order_number, group_id, buyer_id, status, total_amount, estimated_delivery)
      VALUES 
        ('ORD-001', 1, 7, 'shipped', 215.96, NOW() + INTERVAL '5 days'),
        ('ORD-002', 2, 8, 'paid', 152.48, NOW() + INTERVAL '7 days'),
        ('ORD-003', 1, 9, 'delivered', 359.95, NOW() - INTERVAL '2 days')
      RETURNING id
    `);
    console.log(`✅ Created ${ordersResult.rowCount} orders`);
    
    // 7. Create order items
    console.log('📦 Adding order items...');
    await client.query(`
      INSERT INTO order_items (order_id, product_id, quantity, price)
      VALUES 
        (1, 8, 6, 35.99),
        (2, 1, 4, 38.12),
        (3, 14, 2, 175.99)
    `);
    console.log('✅ Added order items');
    
    // 8. Create escrow transactions
    console.log('🔒 Seeding escrow transactions...');
    const escrowResult = await client.query(`
      INSERT INTO escrow_transactions 
        (transaction_number, order_id, buyer_id, seller_id, amount, escrow_fee, status, 
         paid_at, shipped_at, delivered_at, inspection_deadline, auto_release_at, tracking_id, courier)
      VALUES 
        ('ESC-001', 1, 7, 3, 215.96, 6.48, 'pending_inspection', 
         NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 day',
         NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days', 'TRK-9876543210', 'FastShip Express'),
        ('ESC-002', 2, 8, 5, 152.48, 4.57, 'locked', 
         NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', NULL,
         NULL, NULL, 'TRK-1234567890', 'QuickDeliver Co.'),
        ('ESC-003', 3, 9, 5, 359.95, 10.80, 'released',
         NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '5 days',
         NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', 'TRK-5555666777', 'FastShip Express')
      RETURNING id
    `);
    console.log(`✅ Created ${escrowResult.rowCount} escrow transactions`);
    
    // 9. Create sample dispute
    console.log('⚖️ Seeding disputes...');
    const disputeResult = await client.query(`
      INSERT INTO disputes (dispute_number, transaction_id, reason, status)
      VALUES 
        ('DIS-001', 1, 'damaged', 'under_review')
      RETURNING id
    `);
    console.log(`✅ Created ${disputeResult.rowCount} disputes`);
    
    // 10. Create trust scores for members
    console.log('⭐ Seeding trust scores...');
    await client.query(`
      INSERT INTO trust_scores 
        (user_id, score, completed_transactions, total_transactions, dispute_rate, buyer_rating, seller_rating, 
         id_verified, email_verified, phone_verified)
      VALUES 
        (7, 92, 47, 50, 2.0, 4.8, 4.6, true, true, true),
        (8, 88, 32, 35, 3.0, 4.7, 4.5, true, true, true),
        (9, 95, 58, 60, 1.0, 4.9, 4.8, true, true, true),
        (10, 85, 25, 28, 4.0, 4.6, 4.4, true, true, false)
    `);
    console.log('✅ Created trust scores');
    
    await client.query('COMMIT');
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📝 Demo Accounts:');
    console.log('   Super User: super@admin.com / password123');
    console.log('   Admin: admin@savetogether.com / password123');
    console.log('   Vendor (SolarTech): vendor@solartech.com / password123');
    console.log('   Vendor (PowerCell): vendor@powercell.com / password123');
    console.log('   Member: afam@example.com / password123');
    console.log('   Member: chioma@example.com / password123\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    client.release();
    process.exit(0);
  }
}

seedDatabase().catch(console.error);
