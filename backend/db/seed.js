import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import pool from '../config/database.js';

export async function seedDatabase(customPool = pool) {
  const client = await (customPool || pool).connect();

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
      RETURNING id, name
    `);
    console.log(`✅ Created ${vendorsResult.rowCount} vendors`);

    const vendorMap = {};
    vendorsResult.rows.forEach(r => {
      vendorMap[r.name] = r.id;
    });

    // 2. Create Users
    console.log('👥 Seeding users...');
    const hashedPassword = await bcrypt.hash('password123', 10);

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
        ('vendor@officeessentials.com', $1, 'Office Essentials Plus', 'vendor', 'https://api.dicebear.com/7.x/initials/svg?seed=OEP', $6, NULL),
        ('afam@example.com', $1, 'Afam', 'member', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Afam', NULL, 92),
        ('chioma@example.com', $1, 'Chioma', 'member', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Chioma', NULL, 88),
        ('eze@example.com', $1, 'Eze', 'member', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eze', NULL, 95),
        ('ngozi@example.com', $1, 'Ngozi', 'member', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ngozi', NULL, 85)
      RETURNING id, email, name
    `,
      [
        hashedPassword,
        vendorMap['SolarTech Distributors'],
        vendorMap['PowerCell Solutions'],
        vendorMap['Fresh Farm Collective'],
        vendorMap['Tech Wholesale Hub'],
        vendorMap['Office Essentials Plus'],
      ],
    );
    console.log(
      `✅ Created ${usersResult.rowCount} users (password: password123)`,
    );
    const userMap = {};
    usersResult.rows.forEach(r => {
      userMap[r.email] = r.id;
    });

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
      RETURNING id, name
    `,
      [
        vendorMap['Fresh Farm Collective'],
        vendorMap['Tech Wholesale Hub'],
        vendorMap['Office Essentials Plus'],
        vendorMap['PowerCell Solutions'],
        vendorMap['SolarTech Distributors'],
        vendorMap['Industrial Supplies Co.'],
      ],
    );
    console.log(`✅ Created ${productsResult.rowCount} products`);

    const productMap = {};
    productsResult.rows.forEach(r => {
      productMap[r.name] = r.id;
    });

    // 4. Create Groups
    console.log('👨‍👩‍👧‍👦 Seeding groups...');
    const groupsResult = await client.query(
      `
      INSERT INTO groups (name, description, join_code, moq_target, current_quantity, status, created_by)
      VALUES 
        ('Office Supplies Squad', 'Bulk buying for our co-working space', 'OFFICE2024', 100, 75, 'active', $1),
        ('Neighborhood Grocery', 'Fresh produce and pantry staples', 'GROCERY123', 50, 20, 'active', $2),
        ('Tech Accessories', 'Phone cases, chargers, and cables', 'TECH456', 30, 27, 'pending', $3)
      RETURNING id, name
    `,
      [userMap['afam@example.com'], userMap['ngozi@example.com'], userMap['afam@example.com']],
    );
    console.log(`✅ Created ${groupsResult.rowCount} groups`);

    const groupMap = {};
    groupsResult.rows.forEach(r => {
      groupMap[r.name] = r.id;
    });

    // 5. Add group members
    console.log('🤝 Adding group members...');
    await client.query(
      `
      INSERT INTO group_members (group_id, user_id, role)
      VALUES 
        -- Office Supplies Squad
        ($1, $2, 'admin'), ($1, $3, 'member'), ($1, $4, 'member'),
        -- Neighborhood Grocery
        ($5, $6, 'admin'), ($5, $7, 'member'), ($5, $8, 'member'), ($5, $9, 'member'),
        -- Tech Accessories
        ($10, $11, 'admin'), ($10, $12, 'member')
    `,
      [
        groupMap['Office Supplies Squad'],
        userMap['afam@example.com'],
        userMap['chioma@example.com'],
        userMap['eze@example.com'],
        groupMap['Neighborhood Grocery'],
        userMap['ngozi@example.com'],
        userMap['afam@example.com'],
        userMap['chioma@example.com'],
        userMap['eze@example.com'],
        groupMap['Tech Accessories'],
        userMap['afam@example.com'],
        userMap['chioma@example.com'],
      ],
    );
    console.log('✅ Added group members');

    // 6. Create sample orders (strictly aligned with group assigned vendors)
    console.log('📋 Seeding orders...');
    const ordersResult = await client.query(
      `
      INSERT INTO orders (order_number, group_id, buyer_id, status, total_amount, estimated_delivery)
      VALUES 
        ('ORD-001', $1, $2, 'shipped', 215.94, NOW() + INTERVAL '5 days'),
        ('ORD-002', $3, $4, 'paid', 137.97, NOW() + INTERVAL '7 days'),
        ('ORD-003', $5, $6, 'delivered', 299.90, NOW() - INTERVAL '2 days'),
        ('ORD-004', $7, $8, 'shipped', 77.98, NOW() + INTERVAL '6 days'),
        ('ORD-005', $9, $10, 'paid', 171.96, NOW() + INTERVAL '4 days')
      RETURNING id, order_number
    `,
      [
        groupMap['Office Supplies Squad'], userMap['afam@example.com'],
        groupMap['Neighborhood Grocery'], userMap['chioma@example.com'],
        groupMap['Office Supplies Squad'], userMap['eze@example.com'],
        groupMap['Neighborhood Grocery'], userMap['ngozi@example.com'],
        groupMap['Tech Accessories'], userMap['afam@example.com'],
      ],
    );
    console.log(`✅ Created ${ordersResult.rowCount} orders`);

    const orderMap = {};
    ordersResult.rows.forEach(r => {
      orderMap[r.order_number] = r.id;
    });

    // 7. Create order items (matching products owned by assigned vendor)
    console.log('📦 Adding order items...');
    await client.query(
      `
      INSERT INTO order_items (order_id, product_id, quantity, price)
      VALUES 
        -- ORD-001: Premium Copy Paper (Office Supplies Squad <- Office Essentials Plus)
        ($1, $2, 6, 35.99),
        -- ORD-002: Premium Organic Rice (Neighborhood Grocery <- Fresh Farm Collective)
        ($3, $4, 3, 45.99),
        -- ORD-003: Multipurpose Printer Paper A4 (Office Supplies Squad <- Office Essentials Plus)
        ($5, $6, 10, 29.99),
        -- ORD-004: Olive Oil Extra Virgin (Neighborhood Grocery <- Fresh Farm Collective)
        ($7, $8, 2, 38.99),
        -- ORD-005: USB-C Charging Cables (Tech Accessories <- Tech Wholesale Hub)
        ($9, $10, 4, 42.99)
    `,
      [
        orderMap['ORD-001'], productMap['Premium Copy Paper (10 reams)'],
        orderMap['ORD-002'], productMap['Premium Organic Rice (25kg)'],
        orderMap['ORD-003'], productMap['Multipurpose Printer Paper A4'],
        orderMap['ORD-004'], productMap['Olive Oil Extra Virgin (5L)'],
        orderMap['ORD-005'], productMap['USB-C Charging Cables (20 pack)'],
      ],
    );
    console.log('✅ Added order items');

    // 8. Create Chat Conversations (Group-Vendor pairings realigned)
    console.log('💬 Seeding chat conversations...');
    const vendorConversationsResult = await client.query(
      `
      INSERT INTO conversations (type, title, avatar, group_id, vendor_id)
      VALUES 
        ('group-vendor', $1, '📎', $2, $3),
        ('group-vendor', $4, '🥬', $5, $6),
        ('group-vendor', $7, '⚡', $8, $9)
      RETURNING id, title, group_id, vendor_id
    `,
      [
        'Office Essentials Plus',
        groupMap['Office Supplies Squad'],
        userMap['vendor@officeessentials.com'],
        'Fresh Farm Collective',
        groupMap['Neighborhood Grocery'],
        userMap['vendor@freshfarm.com'],
        'Tech Wholesale Hub',
        groupMap['Tech Accessories'],
        userMap['vendor@techwholesale.com'],
      ],
    );
    console.log(`✅ Created ${vendorConversationsResult.rowCount} group-vendor conversations`);

    const convoMap = {};
    vendorConversationsResult.rows.forEach(r => {
      convoMap[r.title] = r.id;
    });

    // 9. Add conversation participants
    console.log('👥 Adding conversation participants...');
    await client.query(`
      INSERT INTO conversation_participants (conversation_id, user_id, role, can_send)
      VALUES 
        -- Office Essentials Plus chat (Office Supplies Squad)
        ('${convoMap['Office Essentials Plus']}', '${userMap['afam@example.com']}', 'admin', true),
        ('${convoMap['Office Essentials Plus']}', '${userMap['chioma@example.com']}', 'member', false),
        ('${convoMap['Office Essentials Plus']}', '${userMap['eze@example.com']}', 'member', false),
        ('${convoMap['Office Essentials Plus']}', '${userMap['vendor@officeessentials.com']}', 'vendor', true),

        -- Fresh Farm Collective chat (Neighborhood Grocery)
        ('${convoMap['Fresh Farm Collective']}', '${userMap['ngozi@example.com']}', 'admin', true),
        ('${convoMap['Fresh Farm Collective']}', '${userMap['afam@example.com']}', 'member', false),
        ('${convoMap['Fresh Farm Collective']}', '${userMap['chioma@example.com']}', 'member', false),
        ('${convoMap['Fresh Farm Collective']}', '${userMap['eze@example.com']}', 'member', false),
        ('${convoMap['Fresh Farm Collective']}', '${userMap['vendor@freshfarm.com']}', 'vendor', true),

        -- Tech Wholesale Hub chat (Tech Accessories)
        ('${convoMap['Tech Wholesale Hub']}', '${userMap['afam@example.com']}', 'admin', true),
        ('${convoMap['Tech Wholesale Hub']}', '${userMap['chioma@example.com']}', 'member', false),
        ('${convoMap['Tech Wholesale Hub']}', '${userMap['vendor@techwholesale.com']}', 'vendor', true)
      ON CONFLICT (conversation_id, user_id) DO UPDATE
      SET role = EXCLUDED.role,
          can_send = EXCLUDED.can_send;
    `);
    console.log('✅ Added conversation participants');

    // 10. Create messages
    console.log('💭 Seeding messages...');
    const now = new Date();

    // Get automatically created group internal conversations
    const groupConversationsResult = await client.query(
      `SELECT id, group_id FROM conversations WHERE type = 'group' AND group_id IN ($1, $2, $3)`,
      [groupMap['Office Supplies Squad'], groupMap['Neighborhood Grocery'], groupMap['Tech Accessories']]
    );
    const internalConvos = {};
    groupConversationsResult.rows.forEach(r => {
      internalConvos[r.group_id] = r.id;
    });

    // Messages for Office Supplies Squad internal chat
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
        internalConvos[groupMap['Office Supplies Squad']],
        userMap['afam@example.com'],
        new Date(now - 2 * 60 * 60 * 1000),
        userMap['chioma@example.com'],
        new Date(now - 108 * 60 * 1000),
        userMap['eze@example.com'],
        new Date(now - 90 * 60 * 1000),
        new Date(now - 60 * 60 * 1000),
        new Date(now - 30 * 60 * 1000),
      ],
    );

    // Messages for Neighborhood Grocery internal chat
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
        internalConvos[groupMap['Neighborhood Grocery']],
        userMap['ngozi@example.com'],
        new Date(now - 5 * 60 * 60 * 1000),
        userMap['afam@example.com'],
        new Date(now - 4.5 * 60 * 60 * 1000),
        userMap['chioma@example.com'],
        new Date(now - 3 * 60 * 60 * 1000),
        userMap['eze@example.com'],
        new Date(now - 2 * 60 * 60 * 1000),
      ],
    );

    // Messages for Tech Accessories internal chat
    await client.query(
      `
      INSERT INTO messages (conversation_id, sender_id, content, created_at)
      VALUES 
        ($1, $2, 'Found a great deal on phone cases and cables!', $3),
        ($1, $4, 'How many units do we need for MOQ?', $5),
        ($1, $2, 'At least 30 units for the wholesale discount.', $6)
    `,
      [
        internalConvos[groupMap['Tech Accessories']],
        userMap['afam@example.com'],
        new Date(now - 3 * 60 * 60 * 1000),
        userMap['chioma@example.com'],
        new Date(now - 2.5 * 60 * 60 * 1000),
        new Date(now - 1 * 60 * 60 * 1000),
      ],
    );

    // Group-Vendor Messages:
    // 1. Office Supplies Squad <-> Office Essentials Plus (paper & stationery quotes)
    await client.query(
      `
      INSERT INTO messages (conversation_id, sender_id, content, created_at)
      VALUES 
        ($1, $2, 'Hi, I''m requesting a bulk quote for copy paper and stationery for our co-working office.', $3),
        ($1, $4, 'Hello Afam! We have premium copy paper and multipurpose A4 in stock. How many reams do you need?', $5),
        ($1, $2, 'We need at least 50 reams of copy paper and some stationery items.', $6),
        ($1, $4, 'We offer a 20% volume discount for orders over 40 reams, plus free delivery.', $7),
        ($1, $2, 'That sounds great, we''ll finalize our group order shortly!', $8)
    `,
      [
        convoMap['Office Essentials Plus'],
        userMap['afam@example.com'],
        new Date(now - 2 * 60 * 60 * 1000),
        userMap['vendor@officeessentials.com'],
        new Date(now - 1.8 * 60 * 60 * 1000),
        new Date(now - 1.5 * 60 * 60 * 1000),
        new Date(now - 1.2 * 60 * 60 * 1000),
        new Date(now - 45 * 60 * 1000),
      ],
    );

    // 2. Neighborhood Grocery <-> Fresh Farm Collective (organic rice & olive oil bulk pricing)
    await client.query(
      `
      INSERT INTO messages (conversation_id, sender_id, content, created_at)
      VALUES 
        ($1, $2, 'Hello! Our neighborhood purchasing group is interested in bulk pricing for organic rice and olive oil.', $3),
        ($1, $4, 'Welcome Ngozi! We have 25kg bags of organic rice and 5L tins of extra virgin olive oil ready for bulk orders.', $5),
        ($1, $2, 'What is the MOQ and delivery turnaround for our area?', $6),
        ($1, $4, 'MOQ is 10 bags of rice and 6 tins of olive oil. We deliver within 2-3 business days.', $7),
        ($1, $2, 'Perfect, our members are pooling their allocations now.', $8)
    `,
      [
        convoMap['Fresh Farm Collective'],
        userMap['ngozi@example.com'],
        new Date(now - 25 * 60 * 60 * 1000),
        userMap['vendor@freshfarm.com'],
        new Date(now - 24.8 * 60 * 60 * 1000),
        new Date(now - 24.5 * 60 * 60 * 1000),
        new Date(now - 24.3 * 60 * 60 * 1000),
        new Date(now - 24 * 60 * 60 * 1000),
      ],
    );

    // 3. Tech Accessories <-> Tech Wholesale Hub (USB-C cables, speakers, bulk packaging)
    await client.query(
      `
      INSERT INTO messages (conversation_id, sender_id, content, created_at)
      VALUES 
        ($1, $2, 'Hi! We''re putting together a bulk order for fast-charging USB-C cables and Bluetooth speakers.', $3),
        ($1, $4, 'Hello Afam! We have 20-packs of braided USB-C cables and waterproof Bluetooth speakers available.', $5),
        ($1, $2, 'Can you provide bulk packaging options and volume discounts for 20+ units?', $6),
        ($1, $4, 'Yes, bulk packaging includes individual retail boxes with a 15% discount for orders meeting MOQ.', $7),
        ($1, $2, 'Excellent, we will submit the group order today.', $8)
    `,
      [
        convoMap['Tech Wholesale Hub'],
        userMap['afam@example.com'],
        new Date(now - 2 * 60 * 60 * 1000),
        userMap['vendor@techwholesale.com'],
        new Date(now - 1.8 * 60 * 60 * 1000),
        new Date(now - 1.5 * 60 * 60 * 1000),
        new Date(now - 1.2 * 60 * 60 * 1000),
        new Date(now - 45 * 60 * 1000),
      ],
    );
    console.log('✅ Created messages for all conversations');

    // 11. Create escrow transactions (realigned sellers matching product vendors)
    console.log('🔒 Seeding escrow transactions...');
    const escrowResult = await client.query(
      `
      INSERT INTO escrow_transactions 
        (transaction_number, order_id, buyer_id, seller_id, amount, escrow_fee, status, 
         paid_at, shipped_at, delivered_at, inspection_deadline, auto_release_at, tracking_id, courier)
      VALUES 
        -- ESC-001: ORD-001 (Office Supplies Squad, seller: Office Essentials Plus)
        ($1, $2, $3, $4, 215.94, 6.48, 'pending_inspection', 
         NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 day',
         NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days', $5, $6),
        
        -- ESC-002: ORD-002 (Neighborhood Grocery, seller: Fresh Farm Collective)
        ($7, $8, $9, $10, 137.97, 4.14, 'locked', 
         NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', NULL,
         NULL, NULL, $11, $12),
        
        -- ESC-003: ORD-003 (Office Supplies Squad, seller: Office Essentials Plus)
        ($13, $14, $15, $16, 299.90, 9.00, 'released',
         NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '5 days',
         NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', $17, $18),
        
        -- ESC-004: ORD-004 (Neighborhood Grocery, seller: Fresh Farm Collective)
        ($19, $20, $21, $22, 77.98, 2.34, 'pending_inspection',
         NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', NULL,
         NOW() + INTERVAL '4 days', NOW() + INTERVAL '4 days', $23, $24),
        
        -- ESC-005: ORD-005 (Tech Accessories, seller: Tech Wholesale Hub)
        ($25, $26, $27, $28, 171.96, 5.16, 'locked',
         NOW() - INTERVAL '1 day', NULL, NULL,
         NULL, NULL, $29, $30)
      RETURNING id, transaction_number
    `,
      [
        'ESC-001',
        orderMap['ORD-001'],
        userMap['afam@example.com'],
        userMap['vendor@officeessentials.com'],
        'TRK-9876543210',
        'FastShip Express',

        'ESC-002',
        orderMap['ORD-002'],
        userMap['chioma@example.com'],
        userMap['vendor@freshfarm.com'],
        'TRK-1234567890',
        'QuickDeliver Co.',

        'ESC-003',
        orderMap['ORD-003'],
        userMap['eze@example.com'],
        userMap['vendor@officeessentials.com'],
        'TRK-5555666777',
        'FastShip Express',

        'ESC-004',
        orderMap['ORD-004'],
        userMap['ngozi@example.com'],
        userMap['vendor@freshfarm.com'],
        'TRK-7777888999',
        'QuickDeliver Co.',

        'ESC-005',
        orderMap['ORD-005'],
        userMap['afam@example.com'],
        userMap['vendor@techwholesale.com'],
        'TRK-3333444555',
        'FastShip Express',
      ],
    );
    console.log(`✅ Created ${escrowResult.rowCount} escrow transactions`);

    const escrowMap = {};
    escrowResult.rows.forEach(r => {
      escrowMap[r.transaction_number] = r.id;
    });

    // 12. Create sample dispute
    console.log('⚖️ Seeding disputes...');
    const disputeResult = await client.query(
      `
      INSERT INTO disputes (dispute_number, transaction_id, reason, status)
      VALUES 
        ($1, $2, 'damaged', 'under_review')
      RETURNING id
    `,
      ['DIS-001', escrowMap['ESC-001']],
    );
    console.log(`✅ Created ${disputeResult.rowCount} disputes`);

    // 13. Create trust scores for members
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
      [
        userMap['afam@example.com'],
        userMap['chioma@example.com'],
        userMap['eze@example.com'],
        userMap['ngozi@example.com'],
      ],
    );
    console.log('✅ Created trust scores');

    await client.query('COMMIT');
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📝 Demo Accounts:');
    console.log('   Super User: super@admin.com / password123');
    console.log('   Admin: admin@savetogether.com / password123');
    console.log('   Vendor (Office Essentials Plus): vendor@officeessentials.com / password123');
    console.log('   Vendor (Fresh Farm Collective): vendor@freshfarm.com / password123');
    console.log('   Vendor (Tech Wholesale Hub): vendor@techwholesale.com / password123');
    console.log('   Vendor (SolarTech Distributors): vendor@solartech.com / password123');
    console.log('   Vendor (PowerCell Solutions): vendor@powercell.com / password123');
    console.log('   Member (Afam): afam@example.com / password123');
    console.log('   Member (Chioma): chioma@example.com / password123\n');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default seedDatabase;

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  seedDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}