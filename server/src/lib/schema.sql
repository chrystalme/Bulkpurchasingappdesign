-- ═══════════════════════════════════════════════════════════════════
--  SaveTogether — PostgreSQL Schema
--  Run once:  psql -U postgres -d save_together -f src/lib/schema.sql
--  Or:        node src/lib/migrate.js
-- ═══════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── USERS ────────────────────────────────────────────────────────────
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text unique not null,
  password_hash text not null,
  role          text not null default 'member'
                check (role in ('superUser','admin','vendor','member')),
  avatar        text,
  is_verified   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── VENDORS ──────────────────────────────────────────────────────────
create table if not exists vendors (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references users(id) on delete cascade,
  business_name        text not null,
  description          text,
  location             text,
  logo                 text,
  rating               numeric(3,2) not null default 0,
  review_count         integer not null default 0,
  is_verified          boolean not null default false,
  fulfillment_days_min integer not null default 2,
  fulfillment_days_max integer not null default 5,
  specialties          text[] not null default '{}',
  created_at           timestamptz not null default now()
);

-- ── PRODUCTS ─────────────────────────────────────────────────────────
create table if not exists products (
  id           uuid primary key default gen_random_uuid(),
  vendor_id    uuid not null references vendors(id) on delete cascade,
  name         text not null,
  description  text,
  category     text not null,
  unit         text not null,
  retail_price numeric(12,2) not null,
  bulk_price   numeric(12,2) not null,
  moq          integer not null default 5,
  stock        integer not null default 0,
  images       text[] not null default '{}',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── GROUPS ───────────────────────────────────────────────────────────
create table if not exists groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  admin_id    uuid not null references users(id),
  product_id  uuid references products(id),
  vendor_id   uuid references vendors(id),
  status      text not null default 'forming'
              check (status in ('forming','active','locked','fulfilled','cancelled')),
  target_qty  integer not null default 10,
  current_qty integer not null default 0,
  invite_code text unique not null default substr(md5(random()::text), 1, 8),
  deadline    timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── GROUP MEMBERS ─────────────────────────────────────────────────────
create table if not exists group_members (
  id        uuid primary key default gen_random_uuid(),
  group_id  uuid not null references groups(id) on delete cascade,
  user_id   uuid not null references users(id) on delete cascade,
  qty       integer not null default 1,
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

-- ── ORDERS ───────────────────────────────────────────────────────────
create table if not exists orders (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references groups(id),
  buyer_id     uuid not null references users(id),
  vendor_id    uuid not null references vendors(id),
  product_id   uuid not null references products(id),
  qty          integer not null,
  unit_price   numeric(12,2) not null,
  total_amount numeric(12,2) not null,
  status       text not null default 'pending'
               check (status in ('pending','confirmed','shipped','delivered','disputed','cancelled')),
  tracking_ref text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── ESCROW TRANSACTIONS ───────────────────────────────────────────────
create table if not exists escrow_transactions (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references orders(id) on delete cascade,
  buyer_id           uuid not null references users(id),
  seller_id          uuid not null references vendors(id),
  amount             numeric(12,2) not null,
  status             text not null default 'locked'
                     check (status in ('locked','pending_inspection','released','disputed','refunded')),
  inspection_ends_at timestamptz,
  proof_url          text,
  released_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ── DISPUTES ─────────────────────────────────────────────────────────
create table if not exists disputes (
  id              uuid primary key default gen_random_uuid(),
  escrow_id       uuid not null references escrow_transactions(id),
  raised_by       uuid not null references users(id),
  reason          text not null,
  status          text not null default 'open'
                  check (status in ('open','under_review','resolved_buyer','resolved_seller')),
  resolution_note text,
  resolved_by     uuid references users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── CONVERSATIONS ─────────────────────────────────────────────────────
-- type='internal'  → all group members can read & send
-- type='vendor'    → all members can READ, only admin can SEND
create table if not exists conversations (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references groups(id) on delete cascade,
  type       text not null check (type in ('internal','vendor')),
  vendor_id  uuid references vendors(id),
  created_at timestamptz not null default now(),
  unique (group_id, type, vendor_id)
);

-- ── MESSAGES ─────────────────────────────────────────────────────────
create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid not null references users(id),
  body            text not null,
  attachment_url  text,
  created_at      timestamptz not null default now()
);

-- ── REVIEWS ──────────────────────────────────────────────────────────
create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id),
  reviewer_id uuid not null references users(id),
  vendor_id   uuid not null references vendors(id),
  rating      integer not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  unique (order_id, reviewer_id)
);

-- ── INDEXES ──────────────────────────────────────────────────────────
create index if not exists idx_products_vendor      on products(vendor_id);
create index if not exists idx_products_category    on products(category);
create index if not exists idx_products_active      on products(is_active);
create index if not exists idx_groups_admin         on groups(admin_id);
create index if not exists idx_groups_invite        on groups(invite_code);
create index if not exists idx_group_members_group  on group_members(group_id);
create index if not exists idx_group_members_user   on group_members(user_id);
create index if not exists idx_orders_group         on orders(group_id);
create index if not exists idx_orders_buyer         on orders(buyer_id);
create index if not exists idx_messages_convo       on messages(conversation_id);
create index if not exists idx_messages_created     on messages(conversation_id, created_at);
create index if not exists idx_escrow_order         on escrow_transactions(order_id);
create index if not exists idx_escrow_buyer         on escrow_transactions(buyer_id);
