# SaveTogether — Node.js API

Express + PostgreSQL + Socket.IO backend for the SaveTogether bulk purchasing platform.

## Quick start

```bash
cd server
cp .env.example .env          # fill in your DB credentials and JWT_SECRET
npm install
node src/lib/migrate.js       # create all tables
node src/lib/seed.js          # optional: load demo data
npm run dev                   # starts with --watch (Node 18+)
```

## Environment variables

| Variable       | Description                              | Default                    |
|----------------|------------------------------------------|----------------------------|
| `DB_HOST`      | PostgreSQL host                          | `localhost`                |
| `DB_PORT`      | PostgreSQL port                          | `5432`                     |
| `DB_NAME`      | Database name                            | `save_together`            |
| `DB_USER`      | DB user                                  | `postgres`                 |
| `DB_PASSWORD`  | DB password                              | —                          |
| `PORT`         | API port                                 | `3001`                     |
| `JWT_SECRET`   | Secret for signing JWTs                  | —  (**change this!**)      |
| `JWT_EXPIRES_IN` | Token lifetime                         | `7d`                       |
| `CORS_ORIGIN`  | Allowed frontend origin                  | `http://localhost:5173`    |

## API surface

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/signup` | — | Register (role: member or vendor) |
| POST | `/api/auth/login` | — | Login → JWT token |
| GET | `/api/auth/me` | ✓ | Current user |
| GET | `/api/products` | — | List products (paginated, filterable) |
| GET | `/api/products/categories` | — | Category list with counts |
| GET | `/api/products/:id` | — | Product detail |
| POST | `/api/products` | vendor | Create product |
| PATCH | `/api/products/:id` | vendor/admin | Update product |
| GET | `/api/vendors` | — | List vendors |
| GET | `/api/vendors/:id` | — | Vendor detail + products |
| POST | `/api/vendors` | vendor | Create vendor profile |
| PATCH | `/api/vendors/:id/verify` | admin | Verify vendor |
| GET | `/api/groups` | ✓ | My groups |
| GET | `/api/groups/public` | — | Open groups to join |
| POST | `/api/groups` | ✓ | Create group |
| POST | `/api/groups/join` | ✓ | Join by invite code |
| GET | `/api/groups/:id` | ✓ | Group detail + members |
| POST | `/api/orders` | ✓ | Place order (auto-creates escrow) |
| GET | `/api/orders` | ✓ | My orders |
| PATCH | `/api/orders/:id/status` | vendor/admin | Update order status |
| GET | `/api/escrow` | ✓ | My escrow transactions |
| POST | `/api/escrow/:id/release` | ✓ buyer | Confirm delivery → release funds |
| POST | `/api/escrow/:id/dispute` | ✓ buyer | Open dispute |
| POST | `/api/escrow/:id/upload-proof` | vendor | Upload delivery proof |
| GET | `/api/escrow/disputes/all` | admin | All disputes |
| POST | `/api/escrow/disputes/:id/resolve` | admin | Resolve dispute |
| GET | `/api/chat/conversations` | ✓ | My conversations |
| GET | `/api/chat/conversations/:id/messages` | ✓ | Message history |
| POST | `/api/chat/conversations/:id/messages` | ✓ | Send message |
| GET | `/api/reviews?vendor_id=` | — | Vendor reviews |
| POST | `/api/reviews` | ✓ buyer | Submit review |
| GET | `/api/users` | admin | All users |
| POST | `/api/users` | admin | Create user |
| PATCH | `/api/users/:id` | self/admin | Update user |

## WebSocket events (Socket.IO)

Connect with `{ auth: { token: '<jwt>' } }`.

| Event (client→server) | Payload | Description |
|-----------------------|---------|-------------|
| `join_conversation` | `conversationId` | Subscribe to a chat room |
| `leave_conversation` | `conversationId` | Unsubscribe |
| `typing` | `{ conversationId }` | Broadcast typing indicator |
| `stop_typing` | `{ conversationId }` | Stop typing indicator |

| Event (server→client) | Payload | Description |
|-----------------------|---------|-------------|
| `new_message` | message object | Real-time message delivery |
| `user_typing` | `{ userId, name }` | Someone is typing |
| `user_stop_typing` | `{ userId }` | Typing stopped |

## Chat transparency rule

- **Group Internal chat** — all members can send and read  
- **Group–Vendor chat** — all members can **read**, but only the **group admin** can **send**  
  (enforced server-side; prevents backdoor deals between admin and vendor)
