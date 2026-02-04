# Save Together Backend API

Express + PostgreSQL backend for the "Save Together, Buy Smarter" bulk purchasing application.

## 🎯 Overview

This is a **fully transparent backend** where you control every line of code:
- **Authentication**: JWT-based with bcrypt password hashing
- **Database**: PostgreSQL with raw SQL queries (no ORM magic)
- **Authorization**: Role-based access control (superUser, admin, vendor, member)
- **Business Logic**: Escrow transactions, order management, dispute resolution

## 🏗️ Architecture

```
┌─────────────────┐      HTTP/REST      ┌──────────────────┐      SQL       ┌────────────────┐
│   React App     │ ←─────────────────→ │  Express API     │ ←────────────→ │   PostgreSQL   │
│   (Frontend)    │   fetch/axios       │  (Your Backend)  │   pg library   │   (Database)   │
│   Port 5173     │                     │  Port 3001       │                │   Port 5432    │
└─────────────────┘                     └──────────────────┘                └────────────────┘
         │                                       │
         │         WebSocket (Socket.IO)        │
         └──────────────────────────────────────┘
                    Real-time Chat
```

## 📁 Project Structure

```
server/
├── src/
│   ├── config/
│   │   ├── database.js          # PostgreSQL connection pool
│   │   └── socket.js            # Socket.IO configuration
│   ├── db/
│   │   ├── schema.sql           # Database schema (tables, indexes)
│   │   ├── migrate.js           # Migration script
│   │   ├── seed.js              # Seed data script
│   │   └── reset.js             # Reset database script
│   ├── middleware/
│   │   └── auth.js              # Authentication & authorization middleware
│   ├── routes/
│   │   ├── auth.routes.js       # Login, signup, refresh token
│   │   ├── users.routes.js      # User management (CRUD)
│   │   ├── products.routes.js   # Product catalog
│   │   ├── vendors.routes.js    # Vendor dashboard & stats
│   │   ├── orders.routes.js     # Order management
│   │   ├── escrow.routes.js     # Escrow transactions
│   │   └── chat.routes.js       # Chat API endpoints
│   ├── websocket/
│   │   └── chat.handlers.js     # WebSocket event handlers
│   └── server.js                # Main Express server
├── .env                         # Environment variables
├── .env.example                 # Environment template
├── package.json                 # Dependencies
├── README.md                    # This file
└── CHAT_API.md                  # Chat system documentation
```

## 🚀 Quick Start

### 1. Install PostgreSQL

**Option A: Docker (Recommended)**
```bash
docker run --name save-together-db \
  -e POSTGRES_PASSWORD=dev123 \
  -p 5432:5432 \
  -d postgres:15
```

**Option B: Native Installation**
- Download from [postgresql.org](https://www.postgresql.org/download/)
- Install and create a database named `save_together`

### 2. Install Dependencies

```bash
cd server
npm install
```

### 3. Configure Environment

Copy `.env.example` to `.env` and update if needed:

```bash
cp .env.example .env
```

Default configuration:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=dev123
DB_NAME=save_together
PORT=3001
JWT_SECRET=save-together-secret-key-2026
```

### 4. Create Database

If using Docker, the database is created automatically. If using native PostgreSQL:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE save_together;

# Exit
\q
```

### 5. Run Migrations

Create all database tables:

```bash
npm run migrate
```

This creates:
- `users` - User accounts with roles
- `vendors` - Vendor profiles
- `products` - Product catalog
- `groups` - Bulk purchasing groups
- `orders` - Customer orders
- `order_items` - Order line items
- `escrow_transactions` - Payment escrow
- `disputes` - Dispute management
- `trust_scores` - User reputation
- `conversations` - Chat conversations
- `messages` - Chat messages

### 6. Seed Sample Data

Populate the database with test data:

```bash
npm run seed
```

This creates:
- 6 vendors (SolarTech, PowerCell, etc.)
- 10 users (superUser, admin, vendors, members)
- 20 products (solar panels, batteries, etc.)
- 3 groups with members
- Sample orders and escrow transactions

**Demo Accounts:**
```
Super User:     super@admin.com          / password123
Admin:          admin@savetogether.com   / password123
Vendor (Solar): vendor@solartech.com     / password123
Vendor (Power): vendor@powercell.com     / password123
Member:         afam@example.com         / password123
Member:         chioma@example.com       / password123
```

### 7. Start Server

**Development mode (with auto-restart):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

Server will run on `http://localhost:3001`

### 8. Test the API

**Health Check:**
```bash
curl http://localhost:3001/health
```

**Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"afam@example.com","password":"password123"}'
```

## 📡 API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/login` | Login with email/password | No |
| POST | `/signup` | Create new account | No |
| GET | `/me` | Get current user | Yes |
| POST | `/refresh` | Refresh JWT token | Yes |

### Users (`/api/users`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/` | Get all users | Yes | Admin |
| GET | `/stats` | Get user statistics | Yes | Admin |
| GET | `/role/:role` | Get users by role | Yes | Admin |
| GET | `/:id` | Get user by ID | Yes | Self/Admin |
| POST | `/` | Create new user | Yes | Admin |
| PUT | `/:id` | Update user | Yes | Admin |
| DELETE | `/:id` | Delete user | Yes | SuperUser |
| POST | `/:id/activate` | Activate user | Yes | Admin |
| POST | `/:id/deactivate` | Deactivate user | Yes | Admin |

### Products (`/api/products`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/` | Get all products | No | - |
| GET | `/categories` | Get categories | No | - |
| GET | `/:id` | Get product by ID | No | - |
| POST | `/` | Create product | Yes | Vendor |
| PUT | `/:id` | Update product | Yes | Vendor |
| DELETE | `/:id` | Delete product | Yes | Vendor |

### Vendors (`/api/vendors`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/` | Get all vendors | No | - |
| GET | `/:id` | Get vendor details | No | - |
| GET | `/:id/dashboard` | Get vendor stats | Yes | Vendor |
| GET | `/:id/orders` | Get vendor orders | Yes | Vendor |
| GET | `/:id/customers` | Get vendor customers | Yes | Vendor |

### Orders (`/api/orders`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get user's orders | Yes |
| GET | `/:id` | Get order by ID | Yes |
| POST | `/` | Create new order | Yes |
| PUT | `/:id/status` | Update order status | Yes |

### Escrow (`/api/escrow`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/transactions` | Get user's transactions | Yes |
| GET | `/transactions/:id` | Get transaction details | Yes |
| POST | `/transactions` | Create escrow transaction | Yes |
| PUT | `/transactions/:id/status` | Update escrow status | Yes |
| POST | `/transactions/:id/confirm-delivery` | Confirm delivery | Yes |
| POST | `/transactions/:id/release` | Release funds | Yes |

### Chat (`/api/chat`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/conversations` | Get all conversations | Yes |
| POST | `/conversations` | Create or get conversation | Yes |
| GET | `/conversations/:id/messages` | Get messages | Yes |
| POST | `/conversations/:id/messages` | Send message | Yes |
| PUT | `/conversations/:id/messages/read` | Mark messages as read | Yes |
| PUT | `/conversations/:id/archive` | Archive conversation | Yes |
| GET | `/unread-count` | Get total unread count | Yes |

**See [CHAT_API.md](./CHAT_API.md) for complete WebSocket and REST API documentation.**

## 💬 Real-Time Chat System

The backend includes a complete real-time chat system using **Socket.IO** for WebSocket communication between vendors and members.

### Features

- **Real-time messaging** between vendors and members
- **Typing indicators** - see when someone is typing
- **Read receipts** - know when messages are read
- **Online/offline presence** - see who's online
- **Message history** with pagination
- **Unread message counts** and notifications
- **Product-specific conversations** - chat about specific products

### WebSocket Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});

// Join a conversation
socket.emit('chat:join_conversation', { conversationId: 1 });

// Listen for messages
socket.on('chat:message_received', (message) => {
  console.log('New message:', message);
});

// Send a message
socket.emit('chat:send_message', {
  conversationId: 1,
  messageText: 'Hello!'
});
```

### Chat Workflow

1. **Member initiates** - Members can start conversations with vendors about products
2. **Real-time delivery** - Messages delivered instantly via WebSocket
3. **Persistent storage** - All messages saved to PostgreSQL
4. **Notifications** - Users notified of new messages even when offline
5. **Authorization** - Only conversation participants can access messages

For complete documentation including all WebSocket events, REST endpoints, and usage examples, see **[CHAT_API.md](./CHAT_API.md)**.

## 🔑 Authentication Flow

### 1. Login Request
```javascript
POST /api/auth/login
{
  "email": "afam@example.com",
  "password": "password123"
}
```

### 2. Server Response
```javascript
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 7,
    "email": "afam@example.com",
    "name": "Afam",
    "role": "member",
    "trust_score": 92
  }
}
```

### 3. Making Authenticated Requests
```javascript
GET /api/orders
Headers: {
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## 🛡️ Role-Based Permissions

### SuperUser
- Full access to everything
- Can delete users
- Can manage all resources

### Admin
- Can manage users (create, update, deactivate)
- Can view all orders and transactions
- Cannot delete users

### Vendor
- Can create/update/delete their own products
- Can view their orders and customers
- Access to vendor dashboard

### Member
- Can place orders
- Can view their own orders and transactions
- Can participate in groups

## 🗄️ Database Schema

### Key Tables

**users**
- Stores all user accounts
- Role-based access (superUser, admin, vendor, member)
- Passwords hashed with bcrypt

**products**
- Product catalog with pricing
- Linked to vendors
- MOQ (Minimum Order Quantity) enforcement

**orders**
- Customer orders
- Links to buyers and order items
- Status tracking

**escrow_transactions**
- Payment escrow system
- Links buyers and sellers
- Automatic release timers
- Inspection windows

**trust_scores**
- User reputation system
- Transaction history
- Dispute rates

## 📊 SQL Query Examples

### Get Vendor's Total Revenue
```sql
SELECT 
  COALESCE(SUM(oi.price * oi.quantity), 0) as total_revenue
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN products p ON oi.product_id = p.id
WHERE p.vendor_id = $1 AND o.status != 'cancelled'
```

### Get User's Orders with Items
```sql
SELECT 
  o.*,
  json_agg(
    json_build_object(
      'product_name', p.name,
      'quantity', oi.quantity,
      'price', oi.price
    )
  ) as items
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id
WHERE o.buyer_id = $1
GROUP BY o.id
```

## 🔧 Common Tasks

### Reset Database
```bash
npm run reset
```
This will drop all tables, recreate them, and reseed data.

### Check Database Connection
```bash
psql -U postgres -d save_together -c "SELECT COUNT(*) FROM users;"
```

### View Server Logs
```bash
npm run dev
# Logs show all incoming requests and SQL queries
```

## 🚨 Troubleshooting

### "Connection refused" error
**Problem:** PostgreSQL is not running

**Solution:**
```bash
# If using Docker
docker start save-together-db

# If using native PostgreSQL
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql
```

### "Database does not exist"
**Problem:** Database not created

**Solution:**
```bash
psql -U postgres -c "CREATE DATABASE save_together;"
```

### "JWT malformed" error
**Problem:** Invalid or missing token

**Solution:** Include valid JWT token in Authorization header:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | localhost |
| `DB_PORT` | PostgreSQL port | 5432 |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | dev123 |
| `DB_NAME` | Database name | save_together |
| `PORT` | Server port | 3001 |
| `JWT_SECRET` | JWT signing secret | (change in production!) |
| `CORS_ORIGIN` | Allowed frontend origin | http://localhost:5173 |

## 🔒 Security Notes

⚠️ **For Development Only:**
- Default passwords are simple (change in production!)
- JWT secret should be strong and unique
- CORS is open to localhost:5173
- Error messages include stack traces

🔐 **For Production:**
- Use strong, random JWT secret
- Use environment variables for all secrets
- Implement rate limiting
- Add HTTPS
- Remove stack traces from errors
- Hash all passwords (already using bcrypt)
- Implement input sanitization
- Add request logging

## 🧪 Testing with cURL

**Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"afam@example.com","password":"password123"}'
```

**Get Products:**
```bash
curl http://localhost:3001/api/products
```

**Create Order (with auth):**
```bash
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "items": [
      {"product_id": 1, "quantity": 10}
    ]
  }'
```

## 📚 Learn More

- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [JWT Introduction](https://jwt.io/introduction)
- [bcrypt for Node.js](https://www.npmjs.com/package/bcrypt)

## 🤝 Contributing

This is your backend - you own every line of code! Feel free to:
- Add new endpoints
- Modify business logic
- Optimize queries
- Add features

## 📄 License

MIT