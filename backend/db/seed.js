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

    // Get vendor IDs first before creating users
    const vendorIds = vendorsResult.rows.map(r => r.id);

    const usersResult = await client.query(
      `
      INSERT INTO users (email, password_hash, name, role, avatar, vendor_id, trust_score)
      VALUES 
        ('super@admin.com', $1, 'Super User', 'superUser', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Super', NULL, NULL),
        ('admin@savetogether.com', $1, 'Admin User', 'admin', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin', NULL, NULL),
        ('vendor@solartech.com', $1, 'SolarTech Distributors', 'vendor', 'https://api.dicebear.com/7.x/initials/svg?seed=STD', $2, NULL),
        ('vendor@powercell.com', $1, 'PowerCell Solutions', 'vendor', 'https://api.dicebear.com/7.x/initials/svg?seed=PCS', $3, NULL),
        ('vendor@freshfarm.com', $1, 'Fresh Farm Collective', 'vendor', 'https://api.dicebear.com/7.x/initials/svg?seed=FFC', $4, NULL),
        ('vendor@techwholesale.com', $1, 'Tech Wholesale Hub', 'vendor', 'https://api.dicebear.com/7.x/initials/svg?seed=TWH', $5, NULL),
        ('afam@example.com', $1, 'Afam', 'member', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Afam', NULL, 92),
        ('chioma@example.com', $1, 'Chioma', 'member', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Chioma', NULL, 88),
        ('eze@example.com', $1, 'Eze', 'member', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eze', NULL, 95),
        ('ngozi@example.com', $1, 'Ngozi', 'member', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ngozi', NULL, 85)
      RETURNING id
    `,
      [hashedPassword, vendorIds[4], vendorIds[3], vendorIds[0], vendorIds[1]],
    );
    console.log(
      `✅ Created ${usersResult.rowCount} users (password: password123)`,
    );
    // Store IDs for later use
    const userIds = usersResult.rows.map(r => r.id);

    // 3. Create Products
    console.log('🛍️ Seeding products...');
    const productsResult = await client.query(
      `
      INSERT INTO products (name, image, bulk_price, retail_price, moq, vendor_id, category)
      VALUES 
        -- Fresh Farm Collective products
        ('Premium Organic Rice (25kg)', 'rice-bag', 45.99, 65.99, 10, $1, 'Groceries'),
        ('Olive Oil Extra Virgin (5L)', 'olive-oil', 38.99, 54.99, 6, $1, 'Groceries'),
        
        -- Tech Wholesale Hub products
        ('LED Light Bulbs (Pack of 24)', 'lightbulbs', 28.99, 42.99, 5, $2, 'Electronics'),
        ('USB-C Charging Cables (20 pack)', 'usb-cables', 42.99, 65.99, 4, $2, 'Electronics'),
        ('Wireless Security Camera (Pack of 4)', 'camera', 199.99, 299.99, 5, $2, 'Electronics'),
        ('Smart LED Bulbs RGB (Pack of 12)', 'smart-bulb', 89.99, 129.99, 6, $2, 'Electronics'),
        ('Bluetooth Speakers Waterproof (Pack of 8)', 'speaker', 159.99, 239.99, 4, $2, 'Electronics'),
        
        -- Office Essentials Plus products
        ('Premium Copy Paper (10 reams)', 'paper', 35.99, 52.99, 8, $3, 'Office Supplies'),
        ('Multipurpose Printer Paper A4', 'printer-paper', 29.99, 44.99, 10, $3, 'Office Supplies'),
        
        -- PowerCell Solutions products
        ('Lithium-Ion Battery 18650 (Pack of 4)', 'battery', 24.99, 38.99, 5, $4, 'Batteries'),
        ('LiFePO4 12V 100Ah Battery', 'battery', 289.99, 399.99, 3, $4, 'Batteries'),
        ('Portable Power Bank 20000mAh (Pack of 10)', 'powerbank', 149.99, 229.99, 4, $4, 'Batteries'),
        ('Rechargeable Drill Battery 20V (Pack of 8)', 'drill-battery', 219.99, 319.99, 3, $4, 'Batteries'),
        
        -- SolarTech Distributors products
        ('Monocrystalline Solar Panel 300W', 'solar-panel', 175.99, 249.99, 5, $5, 'Solar Energy'),
        ('Solar Inverter 3000W Pure Sine Wave', 'inverter', 425.99, 599.99, 3, $5, 'Solar Energy'),
        ('Solar Charge Controller MPPT 60A', 'controller', 89.99, 129.99, 6, $5, 'Solar Energy'),
        ('Solar LED Street Light 100W (Pack of 5)', 'street-light', 349.99, 499.99, 4, $5, 'Solar Energy'),
        ('Portable Solar Generator 500Wh', 'solar-generator', 399.99, 549.99, 3, $5, 'Solar Energy'),
        
        -- Industrial Supplies Co. products
        ('Heavy Duty Extension Cords 50ft (Pack of 10)', 'extension-cord', 124.99, 179.99, 5, $6, 'Industrial'),
        ('LED Work Lights 50W (Pack of 6)', 'work-light', 139.99, 199.99, 4, $6, 'Industrial')
      RETURNING id
    `,
      [
        vendorIds[0],
        vendorIds[1],
        vendorIds[2],
        vendorIds[3],
        vendorIds[4],
        vendorIds[5],
      ],
    );
    console.log(`✅ Created ${productsResult.rowCount} products`);

    // 4. Create Groups
    console.log('👨‍👩‍👧‍👦 Seeding groups...');
    const groupsResult = await client.query(
      `
      INSERT INTO groups (name, description, join_code, moq_target, current_quantity, status, created_by)
      VALUES 
        ('Office Supplies Squad', 'Bulk buying for our co-working space', 'OFFICE2024', 100, 75, 'active', $1),
        ('Neighborhood Grocery', 'Fresh produce and pantry staples', 'GROCERY123', 50, 20, 'active', $2),
        ('Tech Accessories', 'Phone cases, chargers, and cables', 'TECH456', 30, 27, 'pending', $3)
      RETURNING id
    `,
      [userIds[6], userIds[9], userIds[6]],
    );
    console.log(`✅ Created ${groupsResult.rowCount} groups`);

    // Store IDs for later use
    const groupIds = groupsResult.rows.map(r => r.id);

    // 5. Add group members
    console.log('🤝 Adding group members...');
    await client.query(
      `
      INSERT INTO group_members (group_id, user_id, role)
      VALUES 
        ($1, $2, 'admin'), ($1, $3, 'member'), ($1, $4, 'member'),
        ($5, $6, 'admin'), ($5, $7, 'member'), ($5, $8, 'member'), ($5, $9, 'member'),
        ($10, $11, 'admin'), ($10, $12, 'member')
    `,
      [
        groupIds[0],
        userIds[6],
        userIds[7],
        userIds[8],
        groupIds[1],
        userIds[9],
        userIds[6],
        userIds[7],
        userIds[8],
        groupIds[2],
        userIds[6],
        userIds[7],
      ],
    );
    console.log('✅ Added group members');

    // 6. Create sample orders
    console.log('📋 Seeding orders...');
    const ordersResult = await client.query(
      `
      INSERT INTO orders (order_number, group_id, buyer_id, status, total_amount, estimated_delivery)
      VALUES 
        ('ORD-001', $1, $2, 'shipped', 215.96, NOW() + INTERVAL '5 days'),
        ('ORD-002', $3, $4, 'paid', 152.48, NOW() + INTERVAL '7 days'),
        ('ORD-003', $1, $5, 'delivered', 359.95, NOW() - INTERVAL '2 days'),
        ('ORD-004', $3, $6, 'shipped', 77.98, NOW() + INTERVAL '6 days')
      RETURNING id
    `,
      [groupIds[0], userIds[6], groupIds[1], userIds[7], userIds[8], userIds[9]],
    );
    console.log(`✅ Created ${ordersResult.rowCount} orders`);
    const orderIds = ordersResult.rows.map(r => r.id);

    // 7. Create order items
    console.log('📦 Adding order items...');
    const productsArray = productsResult.rows.map(r => r.id);
    await client.query(
      `
      INSERT INTO order_items (order_id, product_id, quantity, price)
      VALUES 
        ($1, $2, 6, 35.99),
        ($3, $4, 4, 38.12),
        ($5, $6, 2, 175.99),
        ($7, $8, 2, 38.99)
    `,
      [
        orderIds[0],
        productsArray[7],
        orderIds[1],
        productsArray[0],
        orderIds[2],
        productsArray[13],
        orderIds[3],
        productsArray[1],
      ],
    );
    console.log('✅ Added order items');

    // 8. Create Chat Conversations
    console.log('💬 Seeding chat conversations...');

    // Create group-vendor conversations
    const vendorConversationsResult = await client.query(
      `
      INSERT INTO conversations (type, title, avatar, group_id, vendor_id)
      VALUES 
        ('group-vendor', $1, '🏢', $2, $3),
        ('group-vendor', $4, '⚡', $5, $6),
        ('group-vendor', $7, '🖊️', $8, $9)
      RETURNING id, group_id, vendor_id
    `,
      [
        'GreenTech Solutions',
        groupIds[0],
        userIds[2], // vendor@solartech.com
        'PowerCell Inc.',
        groupIds[1],
        userIds[3], // vendor@powercell.com
        'BulkOffice Pro',
        groupIds[2],
        userIds[5], // vendor@techwholesale.com
      ],
    );
    console.log(`✅ Created ${vendorConversationsResult.rowCount} group-vendor conversations`);
    const vendorConversations = vendorConversationsResult.rows;

    // 9. Add conversation participants
    console.log('👥 Adding conversation participants...');
    // Note: Participants for 'group' conversations are added automatically by triggers.
    // We only need to add participants for the 'group-vendor' conversations.

    // Get the members of each group
    const group1Members = [userIds[6], userIds[7], userIds[8]];
    const group2Members = [userIds[9], userIds[6], userIds[7], userIds[8]];
    const group3Members = [userIds[6], userIds[7]];

    // Add participants for GreenTech vendor chat (Group 1)
    const greenTechConvo = vendorConversations.find(c => c.group_id === groupIds[0]);
    const greenTechParticipants = group1Members.map(user_id => `('${greenTechConvo.id}', '${user_id}', 'member')`).join(',');
    await client.query(`
      INSERT INTO conversation_participants (conversation_id, user_id, role)
      VALUES 
        ${greenTechParticipants},
        ('${greenTechConvo.id}', '${userIds[2]}', 'vendor')
    `);

    // Add participants for PowerCell vendor chat (Group 2)
    const powerCellConvo = vendorConversations.find(c => c.group_id === groupIds[1]);
    const powerCellParticipants = group2Members.map(user_id => `('${powerCellConvo.id}', '${user_id}', 'member')`).join(',');
    await client.query(`
      INSERT INTO conversation_participants (conversation_id, user_id, role)
      VALUES 
        ${powerCellParticipants},
        ('${powerCellConvo.id}', '${userIds[3]}', 'vendor')
    `);

    // Add participants for BulkOffice vendor chat (Group 3)
    const bulkOfficeConvo = vendorConversations.find(c => c.group_id === groupIds[2]);
    const bulkOfficeParticipants = group3Members.map(user_id => `('${bulkOfficeConvo.id}', '${user_id}', 'member')`).join(',');
     await client.query(`
      INSERT INTO conversation_participants (conversation_id, user_id, role)
      VALUES 
        ${bulkOfficeParticipants},
        ('${bulkOfficeConvo.id}', '${userIds[5]}', 'vendor')
    `);

    console.log('✅ Added conversation participants');

    // 10. Create messages
    console.log('💭 Seeding messages...');
    const now = new Date();

    // Get the automatically created group conversations
    const groupConversationsResult = await client.query(
      `SELECT id, group_id FROM conversations WHERE type = 'group' AND group_id IN ($1, $2, $3)`,
      [groupIds[0], groupIds[1], groupIds[2]]
    );
    const groupConvo1Id = groupConversationsResult.rows.find(r => r.group_id === groupIds[0]).id;
    const groupConvo2Id = groupConversationsResult.rows.find(r => r.group_id === groupIds[1]).id;
    const groupConvo3Id = groupConversationsResult.rows.find(r => r.group_id === groupIds[2]).id;

    // Messages for Office Supplies Squad internal chat (Group 1)
    await client.query(
      `
      INSERT INTO messages (conversation_id, sender_id, content, created_at)
      VALUES 
        ($1, $2, 'Hey team! Time for our quarterly office supply order.', $3),
        ($1, $4, 'We definitely need more printer paper.', $5),
        ($1, $6, 'And pens! We''re running low.', $7),
        ($1, $4, 'Should we get sticky notes too?', $8),
        ($1, $2, 'Anyone wants to add notebooks to the order?', $9)
    `,
      [
        groupConvo1Id,
        userIds[6], // Afam
        new Date(now - 2 * 60 * 60 * 1000),
        userIds[7], // Chioma
        new Date(now - 108 * 60 * 1000),
        userIds[8], // Eze
        new Date(now - 90 * 60 * 1000),
        new Date(now - 60 * 60 * 1000),
        new Date(now - 30 * 60 * 1000),
      ],
    );

    // Messages for Neighborhood Grocery internal chat (Group 2)
    await client.query(
      `
      INSERT INTO messages (conversation_id, sender_id, content, created_at)
      VALUES 
        ($1, $2, 'Looking at fresh produce for our group buy.', $3),
        ($1, $4, 'What''s available this week?', $5),
        ($1, $6, 'I''m interested in organic vegetables.', $7),
        ($1, $8, 'Count me in for the bulk order.', $9)
    `,
      [
        groupConvo2Id,
        userIds[9], // Ngozi
        new Date(now - 5 * 60 * 60 * 1000),
        userIds[6], // Afam
        new Date(now - 4.5 * 60 * 60 * 1000),
        userIds[7], // Chioma
        new Date(now - 3 * 60 * 60 * 1000),
        userIds[8], // Eze
        new Date(now - 2 * 60 * 60 * 1000),
      ],
    );

    // Messages for Tech Accessories internal chat (Group 3)
    await client.query(
      `
      INSERT INTO messages (conversation_id, sender_id, content, created_at)
      VALUES 
        ($1, $2, 'Found a great deal on phone cases!', $3),
        ($1, $4, 'How many units are we looking at?', $5),
        ($1, $2, 'At least 30 for the bulk discount.', $6)
    `,
      [
        groupConvo3Id,
        userIds[6], // Afam
        new Date(now - 3 * 60 * 60 * 1000),
        userIds[7], // Chioma
        new Date(now - 2.5 * 60 * 60 * 1000),
        new Date(now - 1 * 60 * 60 * 1000),
      ],
    );

    // Messages for GreenTech vendor chat (Group 1)
    await client.query(
      `
      INSERT INTO messages (conversation_id, sender_id, content, created_at)
      VALUES 
        ($1, $2, 'Hi, I''m interested in your office supplies.', $3),
        ($1, $4, 'What can we help you with today?', $5),
        ($1, $2, 'We need printer paper, pens, and notebooks.', $6),
        ($1, $4, 'Great! I can send you our catalog with bulk pricing.', $7),
        ($1, $4, 'We have a special promotion running this week!', $8)
    `,
      [
        greenTechConvo.id,
        userIds[6], // Afam
        new Date(now - 2 * 60 * 60 * 1000),
        userIds[2], // vendor@solartech.com
        new Date(now - 1.8 * 60 * 60 * 1000),
        new Date(now - 1.5 * 60 * 60 * 1000),
        new Date(now - 1.2 * 60 * 60 * 1000),
        new Date(now - 45 * 60 * 1000),
      ],
    );

    // Messages for PowerCell vendor chat (Group 2)
    await client.query(
      `
      INSERT INTO messages (conversation_id, sender_id, content, created_at)
      VALUES 
        ($1, $2, 'Hello, I need information about your batteries.', $3),
        ($1, $4, 'Hi! We have several options. What capacity are you looking for?', $5),
        ($1, $2, '200Ah batteries. What''s the minimum order quantity?', $6),
        ($1, $4, 'MOQ is 10 units. Price is $450 per battery with 2-year warranty.', $7),
        ($1, $2, 'Thank you for the information!', $8)
    `,
      [
        powerCellConvo.id,
        userIds[9], // Ngozi
        new Date(now - 25 * 60 * 60 * 1000),
        userIds[3], // vendor@powercell.com
        new Date(now - 24.8 * 60 * 60 * 1000),
        new Date(now - 24.5 * 60 * 60 * 1000),
        new Date(now - 24.3 * 60 * 60 * 1000),
        new Date(now - 24 * 60 * 60 * 1000),
      ],
    );

    // Messages for BulkOffice vendor chat (Group 3)
    await client.query(
      `
      INSERT INTO messages (conversation_id, sender_id, content, created_at)
      VALUES 
        ($1, $2, 'Hi, I need office supplies for a bulk order.', $3),
        ($1, $4, 'Hello! We have a wide range of office supplies. What do you need?', $5),
        ($1, $2, 'Printer paper, pens, and notebooks mainly.', $6),
        ($1, $4, 'Great! I can send you our catalog with bulk pricing.', $7),
        ($1, $4, 'We have a special promotion running this week!', $8)
    `,
      [
        bulkOfficeConvo.id,
        userIds[6], // Afam
        new Date(now - 2 * 60 * 60 * 1000),
        userIds[5], // vendor@techwholesale.com
        new Date(now - 1.8 * 60 * 60 * 1000),
        new Date(now - 1.5 * 60 * 60 * 1000),
        new Date(now - 1.2 * 60 * 60 * 1000),
        new Date(now - 45 * 60 * 1000),
      ],
    );
    console.log('✅ Created messages for all conversations');

    // 12. Create escrow transactions
    console.log('🔒 Seeding escrow transactions...');
    const escrowResult = await client.query(
      `
      INSERT INTO escrow_transactions 
        (transaction_number, order_id, buyer_id, seller_id, amount, escrow_fee, status, 
         paid_at, shipped_at, delivered_at, inspection_deadline, auto_release_at, tracking_id, courier)
      VALUES 
        ($1, $2, $3, $4, 215.96, 6.48, 'pending_inspection', 
         NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 day',
         NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days', $5, $6),
        ($7, $8, $9, $10, 152.48, 4.57, 'locked', 
         NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', NULL,
         NULL, NULL, $11, $12),
        ($13, $14, $15, $16, 359.95, 10.80, 'released',
         NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '5 days',
         NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', $17, $18),
        ($19, $20, $21, $22, 77.98, 2.34, 'pending_inspection',
         NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', NULL,
         NOW() + INTERVAL '4 days', NOW() + INTERVAL '4 days', $23, $24)
      RETURNING id
    `,
      [
        'ESC-001',
        orderIds[0],
        userIds[6],
        userIds[2],
        'TRK-9876543210',
        'FastShip Express',
        'ESC-002',
        orderIds[1],
        userIds[7],
        userIds[3],
        'TRK-1234567890',
        'QuickDeliver Co.',
        'ESC-003',
        orderIds[2],
        userIds[8],
        userIds[3],
        'TRK-5555666777',
        'FastShip Express',
        'ESC-004',
        orderIds[3],
        userIds[9],
        userIds[3],
        'TRK-7777888999',
        'QuickDeliver Co.',
      ],
    );
    console.log(`✅ Created ${escrowResult.rowCount} escrow transactions`);
    const escrowIds = escrowResult.rows.map(r => r.id);

    // 13. Create sample dispute
    console.log('⚖️ Seeding disputes...');
    const disputeResult = await client.query(
      `
      INSERT INTO disputes (dispute_number, transaction_id, reason, status)
      VALUES 
        ($1, $2, 'damaged', 'under_review')
      RETURNING id
    `,
      ['DIS-001', escrowIds[0]],
    );
    console.log(`✅ Created ${disputeResult.rowCount} disputes`);

    // 14. Create trust scores for members
    console.log('⭐ Seeding trust scores...');
    await client.query(
      `
      INSERT INTO trust_scores 
        (user_id, score, completed_transactions, total_transactions, dispute_rate, buyer_rating, seller_rating, 
         id_verified, email_verified, phone_verified)
      VALUES 
        ($1, 92, 47, 50, 2.0, 4.8, 4.6, true, true, true),
        ($2, 88, 32, 35, 3.0, 4.7, 4.5, true, true, true),
        ($3, 95, 58, 60, 1.0, 4.9, 4.8, true, true, true),
        ($4, 85, 25, 28, 4.0, 4.6, 4.4, true, true, false)
    `,
      [userIds[6], userIds[7], userIds[8], userIds[9]],
    );
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