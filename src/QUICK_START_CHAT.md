# Quick Start - Chat System Integration

## 🚀 Get Up and Running in 5 Minutes

### Prerequisites
- ✅ PostgreSQL installed and running
- ✅ Node.js v16+ installed
- ✅ Existing bulk purchasing app database

---

## Step 1: Database Setup (2 minutes)

```bash
# Navigate to backend
cd backend

# Run migration
psql -U postgres -d bulk_purchasing_db -f migrations/006_create_chat_tables.sql

# Verify
psql -U postgres -d bulk_purchasing_db -c "\dt" | grep conversation
```

**Expected output:**
```
conversations
conversation_participants
messages
typing_indicators
message_read_receipts
```

---

## Step 2: Backend Setup (1 minute)

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
nano .env  # or use your favorite editor

# Start server
npm run dev
```

**Expected output:**
```
🚀 Server running on port 3000
📡 Socket.IO initialized
🌐 API: http://localhost:3000/api
💬 WebSocket: ws://localhost:3000
```

---

## Step 3: Frontend Setup (1 minute)

```bash
# Navigate to root
cd ..

# Install Socket.IO client
npm install socket.io-client

# Copy environment file
cp .env.example .env

# No need to edit - defaults are correct
```

---

## Step 4: Update Frontend Code (1 minute)

### Update App.tsx

Replace the ChatDashboard import:

```typescript
// OLD:
import { ChatDashboard } from './components/chat/ChatDashboard';

// NEW:
import { ChatDashboardReal } from './components/chat/ChatDashboardReal';
```

Replace in renderScreen():

```typescript
// OLD:
case 'chat-dashboard':
  return <ChatDashboard navigate={navigate} />;

// NEW:
case 'chat-dashboard':
  return <ChatDashboardReal navigate={navigate} />;
```

### Update AuthContext (Store User ID)

In your login/signup success handler, add:

```typescript
// After successful login
localStorage.setItem('token', response.token);
localStorage.setItem('userId', response.user.id); // ADD THIS LINE
```

---

## Step 5: Start & Test! (30 seconds)

```bash
# Start frontend
npm run dev
```

### Test Checklist:

1. **Login** to your account
2. **Go to Groups** tab
3. **Select a group** you're part of
4. **Click "Chat" tab** - you should see internal chat
5. **Send a message** - it should appear instantly!

Open **two browser windows** side by side:
- Send message in one → Appears immediately in the other! 🎉

---

## Verify Real-Time Works

### Test 1: Real-Time Messaging
1. Open app in Chrome
2. Open app in Firefox (or incognito)
3. Login as different users in same group
4. Send message from Chrome
5. ✅ Should appear instantly in Firefox!

### Test 2: Typing Indicators
1. Two windows with same conversation
2. Start typing in one (don't send)
3. ✅ Other window shows "[Name] is typing..."

### Test 3: Group-Vendor Chat
1. As group admin, browse products
2. Click vendor profile
3. Click "Contact Vendor"
4. ✅ Group-vendor conversation created
5. ✅ All group members can see it (read-only for non-admins)

---

## 🐛 Troubleshooting

### Issue: Socket.IO not connecting

**Check browser console:**
```javascript
// Should see:
✅ Socket.IO connected
```

**If you see connection error:**

1. Check backend is running on port 3000
2. Check `.env` file has correct URL
3. Check token is stored:
```javascript
console.log(localStorage.getItem('token')); // Should show token
```

**Fix:**
```bash
# Restart backend
cd backend
npm run dev

# Restart frontend
cd ..
npm run dev
```

---

### Issue: Messages not sending

**Check:**
1. User is part of the conversation
2. User has permission to send (check if admin for vendor chats)

**Verify in database:**
```sql
SELECT cp.user_id, cp.can_send, u.full_name
FROM conversation_participants cp
JOIN users u ON cp.user_id = u.id
WHERE cp.conversation_id = 'YOUR_CONVERSATION_ID';
```

---

### Issue: Chat not auto-created for group

**This means the trigger didn't fire. Manually create:**

```sql
-- For existing groups without internal chat
INSERT INTO conversations (type, title, group_id, avatar)
SELECT 'group', name || ' - Internal Chat', id, '💬'
FROM groups g
WHERE NOT EXISTS (
  SELECT 1 FROM conversations c 
  WHERE c.group_id = g.id AND c.type = 'group'
);

-- Add all group members to the chat
INSERT INTO conversation_participants (conversation_id, user_id, role, can_send)
SELECT 
  c.id,
  gm.user_id,
  gm.role,
  true
FROM conversations c
JOIN group_members gm ON c.group_id = gm.group_id
WHERE c.type = 'group'
ON CONFLICT (conversation_id, user_id) DO NOTHING;
```

---

## 🎯 Quick Test Script

Run this in your database to test everything:

```sql
-- 1. Check tables created
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('conversations', 'messages', 'conversation_participants')
ORDER BY table_name;

-- 2. Check triggers created
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name LIKE '%chat%';

-- 3. Count conversations
SELECT type, COUNT(*) FROM conversations GROUP BY type;

-- 4. Check recent messages
SELECT 
  c.title,
  m.content,
  u.full_name,
  m.created_at
FROM messages m
JOIN conversations c ON m.conversation_id = c.id
JOIN users u ON m.sender_id = u.id
ORDER BY m.created_at DESC
LIMIT 5;
```

---

## 📝 Environment Variables Reference

### Backend `.env`
```env
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:5173
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bulk_purchasing_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
```

### Frontend `.env`
```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

---

## 🎉 Success Checklist

- ✅ Database tables created
- ✅ Backend server running on port 3000
- ✅ Frontend running on port 5173
- ✅ Socket.IO connected (check console)
- ✅ Can send messages in real-time
- ✅ Typing indicators work
- ✅ Multiple windows show live updates
- ✅ Group chats auto-created
- ✅ Vendor chats show read-only for non-admins

---

## 🚀 You're Done!

Your real-time chat system is now fully operational!

**Next steps:**
- Invite team members to test
- Create group-vendor conversations
- Test on mobile devices
- Deploy to production (see deployment guide)

**Need help?** Check `/CHAT_BACKEND_SETUP.md` for detailed documentation.

---

## 🎨 Demo Flow

### For Group Admin:
1. Create a group → Internal chat auto-created ✅
2. Add members → They auto-join chat ✅
3. Browse products → Contact vendor ✅
4. Negotiate → All members see conversation ✅
5. Members discuss in internal chat ✅

### For Group Member:
1. Join a group ✅
2. See internal chat ✅
3. Send messages to group ✅
4. View vendor negotiations (read-only) ✅
5. Discuss vendor offers in internal chat ✅

**Transparency achieved! 🎊**
