# Chat System Backend Integration - Setup Guide

## 🎯 Complete Full-Stack Real-Time Chat System

This guide will help you set up the complete backend integration for the dual-stream chat system with Socket.IO real-time messaging.

---

## 📁 File Structure

```
project-root/
├── backend/
│   ├── migrations/
│   │   └── 006_create_chat_tables.sql
│   ├── routes/
│   │   └── chat.routes.js
│   ├── controllers/
│   │   └── chat.controller.js
│   ├── socket/
│   │   └── chat.socket.js
│   ├── server.js
│   └── .env
├── lib/
│   ├── api/
│   │   └── chatApi.ts
│   └── socket/
│       └── chatSocket.ts
├── hooks/
│   └── useChat.ts
├── components/
│   └── chat/
│       ├── ChatDashboardReal.tsx
│       └── ChatWindowReal.tsx
└── .env
```

---

## 🚀 Step 1: Database Setup

### 1.1 Run Migration

```bash
cd backend
psql -U postgres -d bulk_purchasing_db -f migrations/006_create_chat_tables.sql
```

### 1.2 Verify Tables Created

```sql
-- Connect to your database
psql -U postgres -d bulk_purchasing_db

-- Check tables
\dt

-- You should see:
-- conversations
-- conversation_participants
-- messages
-- typing_indicators
-- message_read_receipts
```

### 1.3 What the Migration Does

✅ Creates 5 tables for chat system  
✅ Adds indexes for performance  
✅ Creates views for unread counts and conversation lists  
✅ Auto-creates internal chat when group is created (trigger)  
✅ Auto-adds members to internal chat when they join (trigger)  
✅ Implements read-only permissions for group-vendor chats  

---

## 🔧 Step 2: Backend Configuration

### 2.1 Install Dependencies

```bash
cd backend
npm install socket.io
```

Your `package.json` should already have:
- express
- pg (PostgreSQL client)
- jsonwebtoken
- cors
- dotenv

### 2.2 Configure Environment Variables

Create `/backend/.env`:

```bash
cp .env.example .env
```

Edit `.env`:

```env
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:5173

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bulk_purchasing_db
DB_USER=postgres
DB_PASSWORD=your_actual_password

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRES_IN=7d

# Socket.IO
SOCKET_CORS_ORIGIN=http://localhost:5173
```

### 2.3 Update Server Entry Point

The `backend/server.js` file has been created with Socket.IO integration.

**Key features:**
- HTTP server with Socket.IO attached
- CORS configured for frontend
- Chat routes mounted at `/api/chat`
- Real-time socket handlers initialized

### 2.4 Register Chat Routes

Make sure your `backend/server.js` includes:

```javascript
const chatRoutes = require('./routes/chat.routes');
app.use('/api/chat', chatRoutes);
```

This should already be in the server.js file I created.

---

## 🎨 Step 3: Frontend Configuration

### 3.1 Install Dependencies

```bash
cd ../ # Back to root
npm install socket.io-client
```

### 3.2 Configure Environment Variables

Create `/.env`:

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

### 3.3 Update App.tsx

Replace the old ChatDashboard import with the new real-time version:

```typescript
// In App.tsx
import { ChatDashboardReal } from './components/chat/ChatDashboardReal';

// In renderScreen():
case 'chat-dashboard':
  return <ChatDashboardReal navigate={navigate} />;
```

### 3.4 Store User ID in LocalStorage

After login, make sure to store the user ID:

```typescript
// In your login success handler
localStorage.setItem('token', response.token);
localStorage.setItem('userId', response.user.id); // Add this
```

---

## 🔥 Step 4: Start the System

### 4.1 Start Backend

```bash
cd backend
npm run dev  # or node server.js
```

You should see:
```
🚀 Server running on port 3000
📡 Socket.IO initialized
🌐 API: http://localhost:3000/api
💬 WebSocket: ws://localhost:3000
```

### 4.2 Start Frontend

```bash
cd ../  # Back to root
npm run dev
```

You should see:
```
✅ Socket.IO connected
```

In the browser console when you log in.

---

## 🧪 Step 5: Testing

### 5.1 Test Chat Creation

When you create a new group, an internal chat should be automatically created.

**Verify in database:**
```sql
SELECT 
  c.id, 
  c.type, 
  c.title, 
  g.name as group_name 
FROM conversations c
JOIN groups g ON c.group_id = g.id
WHERE c.type = 'group';
```

### 5.2 Test Group Internal Chat

1. Go to Groups tab
2. Select a group
3. Click "Chat" tab
4. Click "Open Group Chat"
5. Send a message
6. Open another browser/incognito window
7. Log in as different user in same group
8. You should see the message in real-time!

### 5.3 Test Group-Vendor Chat

1. As group admin, browse products
2. Click "Contact Vendor" button
3. This should create a group-vendor conversation
4. Send messages to vendor
5. All group members can see the conversation (read-only for non-admins)

### 5.4 Test Typing Indicators

1. Open a chat
2. Start typing (don't send)
3. On another device/window, you should see "[Name] is typing..."

### 5.5 Test Real-Time Updates

1. Have two browsers open with same conversation
2. Send message from one
3. It should appear immediately on the other
4. No page refresh needed!

---

## 📊 API Endpoints Reference

### Conversations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chat/conversations` | Get all user's conversations |
| GET | `/api/chat/conversations/:id` | Get specific conversation |
| POST | `/api/chat/conversations/group-vendor` | Create group-vendor chat |
| GET | `/api/chat/conversations/:id/participants` | Get participants |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chat/conversations/:id/messages` | Get messages |
| POST | `/api/chat/conversations/:id/messages` | Send message |
| PUT | `/api/chat/conversations/:id/read` | Mark as read |
| DELETE | `/api/chat/messages/:id` | Delete message |

### Typing Indicators

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/conversations/:id/typing` | Set typing status |
| GET | `/api/chat/conversations/:id/typing` | Get typing users |

### Stats

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chat/unread-count` | Get total unread count |

---

## 🔌 Socket.IO Events

### Client → Server

| Event | Data | Description |
|-------|------|-------------|
| `join-conversation` | `{ conversationId }` | Join room |
| `leave-conversation` | `{ conversationId }` | Leave room |
| `send-message` | `{ conversationId, content }` | Send message |
| `typing` | `{ conversationId, isTyping }` | Typing indicator |
| `mark-read` | `{ conversationId }` | Mark as read |
| `delete-message` | `{ messageId }` | Delete message |

### Server → Client

| Event | Data | Description |
|-------|------|-------------|
| `new-message` | `ChatMessage` | New message received |
| `user-typing` | `{ userId, userName, conversationId, isTyping }` | User typing |
| `messages-read` | `{ userId, conversationId, readAt }` | Messages read |
| `message-deleted` | `{ messageId, conversationId }` | Message deleted |
| `user-joined` | `{ userId, conversationId }` | User joined room |
| `user-left` | `{ userId, conversationId }` | User left room |
| `user-online-status` | `{ userId, isOnline }` | Online status changed |

---

## 🛡️ Permissions & Security

### Group Internal Chat
- ✅ All group members can send messages
- ✅ All group members can read messages
- ✅ Auto-created when group is created
- ✅ Members auto-added when they join group

### Group-Vendor Chat
- ✅ Only group admin can send messages to vendor
- ✅ All group members can READ messages (transparency!)
- ✅ Vendor can send messages
- ✅ Created on-demand when admin contacts vendor

### Database-Level Enforcement
```sql
-- Check constraint ensures group-vendor chats have vendor_id
CHECK ((type = 'group-vendor' AND vendor_id IS NOT NULL) OR type = 'group')

-- Unique constraint ensures one internal chat per group
UNIQUE (group_id, type)

-- Unique constraint ensures one chat per group-vendor pair
UNIQUE (group_id, vendor_id) WHERE type = 'group-vendor'
```

---

## 🐛 Troubleshooting

### Socket.IO Not Connecting

**Check:**
1. Backend server is running on port 3000
2. Frontend `.env` has correct `VITE_SOCKET_URL`
3. Token is stored in localStorage
4. CORS is configured in backend

**Fix:**
```javascript
// In browser console
console.log(localStorage.getItem('token')); // Should show token
console.log(chatSocket.isConnected()); // Should be true
```

### Messages Not Appearing

**Check:**
1. User is in the conversation (check `conversation_participants` table)
2. Socket is connected
3. User joined the conversation room

**Fix:**
```sql
-- Check if user is participant
SELECT * FROM conversation_participants 
WHERE user_id = 'your-user-id' AND conversation_id = 'conversation-id';
```

### Typing Indicators Not Working

**Check:**
1. Typing indicators are being sent every ~3 seconds
2. They expire after 5 seconds (by design)

**Fix:**
```sql
-- Check active typing indicators
SELECT * FROM typing_indicators 
WHERE expires_at > CURRENT_TIMESTAMP;
```

### Group Chat Not Auto-Created

**Check:**
1. Migration ran successfully
2. Trigger `create_group_chat_trigger` exists

**Fix:**
```sql
-- Manually create for existing groups
INSERT INTO conversations (type, title, group_id, avatar)
SELECT 'group', name || ' - Internal Chat', id, '💬'
FROM groups
WHERE id NOT IN (SELECT group_id FROM conversations WHERE type = 'group');
```

---

## 🎯 Next Steps

### 1. Add File Sharing
```sql
ALTER TABLE messages ADD COLUMN attachment_url TEXT;
ALTER TABLE messages ADD COLUMN attachment_type VARCHAR(50);
```

### 2. Add Message Reactions
```sql
CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id),
  user_id UUID REFERENCES users(id),
  emoji VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(message_id, user_id, emoji)
);
```

### 3. Add Voice Messages
```sql
ALTER TABLE messages ADD COLUMN voice_message_url TEXT;
ALTER TABLE messages ADD COLUMN voice_duration INTEGER; -- in seconds
```

### 4. Add Push Notifications
- Integrate with Firebase Cloud Messaging (FCM)
- Send notifications when user receives message while offline

### 5. Add Message Search
```sql
CREATE INDEX idx_messages_content_search ON messages USING gin(to_tsvector('english', content));
```

---

## 📈 Performance Optimization

### Database Indexing
Already included in migration:
- `idx_messages_conversation` - Fast message retrieval
- `idx_conversations_group` - Fast group lookup
- `idx_conversation_participants_user` - Fast user conversations

### Socket.IO Optimization
- Use Redis adapter for scaling across multiple servers
- Implement message queuing for high traffic

### Caching
- Cache conversation lists with Redis
- Invalidate cache on new message

---

## 🎉 Success!

You now have a fully functional real-time chat system with:

✅ Dual-stream architecture (group internal + group-vendor)  
✅ Real-time messaging with Socket.IO  
✅ Typing indicators  
✅ Read receipts  
✅ Online status  
✅ Message deletion  
✅ Transparent vendor negotiations  
✅ Role-based permissions  
✅ Auto-scaling database schema  

**Happy chatting! 💬**
