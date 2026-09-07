import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool, query } from './db.js';

async function seed() {
  console.log('Seeding database…');

  // ── Users ────────────────────────────────────────────────────────
  const hash = (pw) => bcrypt.hashSync(pw, 12);

  const users = [
    { name: 'Super Admin',    email: 'super@savetogether.com',  password: 'super123',  role: 'superUser' },
    { name: 'Admin User',     email: 'admin@savetogether.com',  password: 'admin123',  role: 'admin' },
    { name: 'FarmgateVendor', email: 'vendor@farmgate.com',     password: 'vendor123', role: 'vendor' },
    { name: 'GreenValley',    email: 'vendor@greenvalley.com',  password: 'vendor123', role: 'vendor' },
    { name: 'Afam Obi',       email: 'afam@example.com',        password: 'member123', role: 'member' },
    { name: 'Chioma Eze',     email: 'chioma@example.com',      password: 'member123', role: 'member' },
    { name: 'Emeka Nwosu',    email: 'emeka@example.com',       password: 'member123', role: 'member' },
  ];

  const userRows = [];
  for (const u of users) {
    const { rows } = await query(
      `insert into users (name, email, password_hash, role, is_verified)
       values ($1,$2,$3,$4,true)
       on conflict (email) do update set name=excluded.name
       returning id, name, email, role`,
      [u.name, u.email, hash(u.password), u.role]
    );
    userRows.push(rows[0]);
  }

  const byEmail = Object.fromEntries(userRows.map((u) => [u.email, u]));

  // ── Vendors ──────────────────────────────────────────────────────
  const vendorSeeds = [
    {
      user_id: byEmail['vendor@farmgate.com'].id,
      business_name: 'Farmgate Direct',
      description: 'Farm-to-doorstep staples. Certified fresh, bulk-ready.',
      location: 'Lagos, NG',
      rating: 4.9,
      review_count: 312,
      fulfillment_days_min: 2,
      fulfillment_days_max: 3,
      specialties: ['Grains', 'Legumes', 'Cereals'],
      is_verified: true,
    },
    {
      user_id: byEmail['vendor@greenvalley.com'].id,
      business_name: 'Green Valley Farm',
      description: 'Certified organic fresh produce delivered in bulk.',
      location: 'Abuja, NG',
      rating: 4.8,
      review_count: 207,
      fulfillment_days_min: 1,
      fulfillment_days_max: 2,
      specialties: ['Vegetables', 'Fruits', 'Herbs'],
      is_verified: true,
    },
  ];

  const vendorRows = [];
  for (const v of vendorSeeds) {
    const { rows } = await query(
      `insert into vendors
         (user_id,business_name,description,location,rating,review_count,
          fulfillment_days_min,fulfillment_days_max,specialties,is_verified)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       on conflict do nothing
       returning id, business_name`,
      [v.user_id,v.business_name,v.description,v.location,v.rating,
       v.review_count,v.fulfillment_days_min,v.fulfillment_days_max,
       v.specialties,v.is_verified]
    );
    if (rows[0]) vendorRows.push(rows[0]);
  }

  if (vendorRows.length) {
    const [fg, gv] = vendorRows;

    // ── Products ──────────────────────────────────────────────────
    const products = [
      { vendor_id: fg.id, name: 'Premium Basmati Rice', category: 'Grains', unit: '25kg sack', retail_price: 4200, bulk_price: 3100, moq: 5, stock: 200, images: ['https://images.unsplash.com/photo-1568347355280-d33fdf77d42a?w=400&h=300&fit=crop'] },
      { vendor_id: fg.id, name: 'Dried Black-eyed Beans', category: 'Legumes', unit: '10kg bag', retail_price: 3800, bulk_price: 2700, moq: 4, stock: 150, images: [] },
      { vendor_id: gv?.id ?? fg.id, name: 'Organic Mixed Vegetables', category: 'Produce', unit: '10kg box', retail_price: 2800, bulk_price: 1950, moq: 3, stock: 80, images: ['https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=300&fit=crop'] },
      { vendor_id: gv?.id ?? fg.id, name: 'Fresh Tomatoes (Plum)', category: 'Produce', unit: '20kg crate', retail_price: 3200, bulk_price: 2100, moq: 5, stock: 120, images: ['https://images.unsplash.com/photo-1485637701894-09ad422f6de6?w=400&h=300&fit=crop'] },
    ];

    for (const p of products) {
      await query(
        `insert into products (vendor_id,name,category,unit,retail_price,bulk_price,moq,stock,images)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict do nothing`,
        [p.vendor_id,p.name,p.category,p.unit,p.retail_price,p.bulk_price,p.moq,p.stock,p.images]
      );
    }
  }

  console.log('✓ Seed complete.');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
