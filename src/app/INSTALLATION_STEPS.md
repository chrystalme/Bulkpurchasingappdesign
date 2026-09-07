# 📦 Installation Steps - Chat System Integration

## Step-by-Step Installation Guide

Follow these exact steps to integrate the chat system into your existing app.

---

## ✅ Prerequisites Check

Before starting, ensure you have:

- [x] PostgreSQL installed and running
- [x] Node.js v16 or higher
- [x] Existing bulk purchasing app database
- [x] Terminal access

```bash
# Check PostgreSQL
psql --version
# Should show: psql (PostgreSQL) 14.x or higher

# Check Node.js
node --version
# Should show: v16.x.x or higher

# Check npm
npm --version
# Should show: 8.x.x or higher
```

---

## 📥 Step 1: Backend Installation

### 1.1 Install Backend Dependencies

```bash
cd backend
npm install socket.io
npm install --save-dev nodemon
```

**Verify package.json includes:**
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "socket.io": "^4.6.1",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

### 1.2 Create Environment File

```bash
# Copy template
cp .env.example .env

# Edit with your credentials
nano .env  # or vim, code, etc.
```

**Required variables:**
```env
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=5432
DB_NAME=bulk_purchasing_db
DB_USER=postgres
DB_PASSWORD=your_actual_password_here

JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d
```

### 1.3 Run Database Migration

**Option A: Using npm script (recommended)**
```bash
npm run migrate
```

**Option B: Manual SQL**
```bash
psql -U postgres -d bulk_purchasing_db -f migrations/006_create_chat_tables.sql
```

**Verify migration success:**
```bash
psql -U postgres -d bulk_purchasing_db -c "SELECT tablename FROM pg_tables WHERE tablename LIKE 'conversation%' OR tablename = 'messages';"
```

**Expected output:**
```
          tablename
-----------------------------
 conversations
 conversation_participants
 messages
 typing_indicators
 message_read_receipts
```

### 1.4 Update Server Entry Point

**If you have an existing server.js:**

Add Socket.IO initialization:

```javascript
// At the top
const http = require('http');
const { Server } = require('socket.io');

// Replace app.listen() with:
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Make io accessible
app.set('io', io);

// Add chat routes
const chatRoutes = require('./routes/chat.routes');
app.use('/api/chat', chatRoutes);

// Initialize Socket.IO
const { initializeChatSocket } = require('./socket/chat.socket');
initializeChatSocket(io);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**If you don't have a server.js:**

Just use the provided `backend/server.js` file!

### 1.5 Test Backend

```bash
npm run dev
```

**Expected output:**
```
🚀 Server running on port 3000
📡 Socket.IO initialized
🌐 API: http://localhost:3000/api
💬 WebSocket: ws://localhost:3000
```

**Test health endpoint:**
```bash
curl http://localhost:3000/api/health
```

**Expected response:**
```json
{
  "status": "ok",
  "message": "Server is running",
  "timestamp": "2024-01-24T10:00:00.000Z"
}
```

---

## 🎨 Step 2: Frontend Installation

### 2.1 Install Frontend Dependencies

```bash
cd ..  # Back to root directory
npm install socket.io-client
```

**Verify package.json includes:**
```json
{
  "dependencies": {
    "socket.io-client": "^4.6.1"
  }
}
```

### 2.2 Create Environment File

```bash
# Copy template
cp .env.example .env
```

**Content (defaults are fine for local dev):**
```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

### 2.3 Update App.tsx

**Import new components:**

```typescript
// Add these imports at the top
import { ChatDashboardReal } from './components/chat/ChatDashboardReal';

// In your renderScreen() function, update the chat-dashboard case:
case 'chat-dashboard':
  return <ChatDashboardReal navigate={navigate} />;
```

### 2.4 Update GroupDetail Component

**Replace old GroupDetail with new one:**

```typescript
// In App.tsx imports:
import { GroupDetailNew } from './components/groups/GroupDetailNew';

// In renderScreen():
case 'group-detail':
  return <GroupDetailNew navigate={navigate} groupId={selectedGroupId} />;
```

### 2.5 Update Authentication (Important!)

**In your login/signup success handler, ADD userId storage:**

```typescript
// Example: In your AuthContext or login component
const handleLoginSuccess = (response) => {
  // Existing code
  localStorage.setItem('token', response.token);
  
  // ADD THIS LINE:
  localStorage.setItem('userId', response.user.id);
  
  // Rest of your code...
};
```

**This is required for chat permissions to work!**

### 2.6 Test Frontend

```bash
npm run dev
```

**Expected output:**
```
VITE v4.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

**Open browser console (F12) and look for:**
```
✅ Socket.IO connected
```

---

## 🧪 Step 3: Integration Testing

### 3.1 Test Group Chat Creation

1. **Login** to your app
2. **Navigate** to Groups tab
3. **Create a new group** (or select existing)
4. **Check database:**

```sql
SELECT c.id, c.type, c.title, g.name as group_name
FROM conversations c
JOIN groups g ON c.group_id = g.id
WHERE c.type = 'group'
ORDER BY c.created_at DESC
LIMIT 5;
```

**You should see:** A conversation with type='group' for your group

### 3.2 Test Real-Time Messaging

**Setup:**
1. Open your app in **Chrome**
2. Open your app in **Firefox** (or incognito Chrome)
3. Login as **different users** in the same group
4. Both navigate to the group chat

**Test:**
1. In Chrome, send a message
2. In Firefox, the message should appear **instantly** without refresh!

✅ **Pass:** Message appears immediately in both windows  
❌ **Fail:** Message doesn't appear → Check console for errors

### 3.3 Test Typing Indicators

**With both browsers open in same chat:**

1. Start typing in Chrome (don't press send)
2. Firefox should show "[Your Name] is typing..."
3. Stop typing for 3 seconds
4. "typing..." message should disappear

✅ **Pass:** Typing indicator works  
❌ **Fail:** No indicator → Check Socket.IO connection

### 3.4 Test Group-Vendor Chat

**As group admin:**

1. Browse products
2. Click on a vendor
3. Click "Contact Vendor" button
4. This should create a group-vendor conversation

**Check database:**
```sql
SELECT c.id, c.type, c.title, u.full_name as vendor_name, g.name as group_name
FROM conversations c
JOIN users u ON c.vendor_id = u.id
JOIN groups g ON c.group_id = g.id
WHERE c.type = 'group-vendor'
ORDER BY c.created_at DESC
LIMIT 5;
```

### 3.5 Test Permissions

**As non-admin group member:**

1. Go to Groups → Select group → Vendors tab
2. Open a vendor conversation
3. You should see:
   - ✅ All messages visible
   - ✅ Read-only notice shown
   - ✅ Send button disabled
   - ✅ "Only group admin can send messages" message

---

## 🔍 Step 4: Verification Checklist

### Database Verification

```sql
-- 1. Check all tables exist
SELECT tablename FROM pg_tables 
WHERE tablename IN ('conversations', 'conversation_participants', 'messages', 'typing_indicators', 'message_read_receipts');
-- Should return 5 rows

-- 2. Check triggers exist
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name LIKE '%chat%';
-- Should return 2 rows: create_group_chat_trigger, add_to_group_chat_trigger

-- 3. Check indexes exist
SELECT indexname FROM pg_indexes 
WHERE indexname LIKE '%conversation%' OR indexname LIKE '%message%';
-- Should return multiple indexes

-- 4. Check views exist
SELECT table_name FROM information_schema.views 
WHERE table_name LIKE '%conversation%';
-- Should return conversation_list_view, unread_counts_view
```

### API Verification

```bash
# Test endpoints (replace TOKEN with your actual JWT)

# 1. Get conversations
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/chat/conversations

# 2. Get unread count
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/chat/unread-count

# 3. Health check
curl http://localhost:3000/api/health
```

### Frontend Verification

**Open browser console (F12) and check:**

```javascript
// 1. Token stored
localStorage.getItem('token')
// Should return: "your.jwt.token"

// 2. User ID stored
localStorage.getItem('userId')
// Should return: "uuid-of-user"

// 3. Socket connected
chatSocket.isConnected()
// Should return: true
```

---

## 🐛 Step 5: Common Issues & Fixes

### Issue 1: Migration Fails

**Error:** `relation "groups" does not exist`

**Cause:** Previous migrations not run

**Fix:**
```bash
# Run all previous migrations first
psql -U postgres -d bulk_purchasing_db -f migrations/001_*.sql
psql -U postgres -d bulk_purchasing_db -f migrations/002_*.sql
# ... etc
# Then run chat migration
psql -U postgres -d bulk_purchasing_db -f migrations/006_create_chat_tables.sql
```

### Issue 2: Socket.IO Not Connecting

**Error:** `Socket connection error` in console

**Causes & Fixes:**

1. **Backend not running:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Wrong URL in .env:**
   ```env
   # Make sure it matches your backend port
   VITE_SOCKET_URL=http://localhost:3000
   ```

3. **CORS issue:**
   ```javascript
   // In backend/server.js, verify:
   cors: {
     origin: 'http://localhost:5173',  // Must match frontend
     credentials: true
   }
   ```

4. **Token not stored:**
   ```javascript
   // In browser console:
   console.log(localStorage.getItem('token'));
   // If null, update your login handler to store it
   ```

### Issue 3: Messages Not Sending

**Error:** `Access denied` or `Permission denied`

**Causes & Fixes:**

1. **User not in conversation:**
   ```sql
   -- Check if user is participant
   SELECT * FROM conversation_participants 
   WHERE user_id = 'your-user-id' AND conversation_id = 'conv-id';
   ```

2. **No send permission:**
   ```sql
   -- Check permission
   SELECT can_send FROM conversation_participants 
   WHERE user_id = 'your-user-id' AND conversation_id = 'conv-id';
   ```

3. **Not admin in vendor chat:**
   - This is expected! Only admins can send to vendors
   - Regular members see read-only interface

### Issue 4: Chat Not Auto-Created

**Problem:** Group exists but no internal chat

**Fix:** Manually create for existing groups

```sql
-- Create missing internal chats
INSERT INTO conversations (type, title, group_id, avatar)
SELECT 'group', name || ' - Internal Chat', id, '💬'
FROM groups
WHERE id NOT IN (
  SELECT group_id FROM conversations WHERE type = 'group'
);

-- Add all members to their group chats
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

### Issue 5: TypeScript Errors

**Error:** `Cannot find module 'socket.io-client'`

**Fix:**
```bash
npm install socket.io-client
npm install --save-dev @types/socket.io-client
```

---

## ✅ Success Criteria

Your installation is successful when:

- [x] Backend starts without errors
- [x] Frontend starts without errors
- [x] Socket.IO connects (check console)
- [x] Database has 5 new tables
- [x] Can send messages in real-time
- [x] Typing indicators work
- [x] Two browsers show live updates
- [x] Group chats auto-create
- [x] Vendor chats show permissions correctly

---

## 📞 Getting Help

### If you're stuck:

1. **Check the docs:**
   - [QUICK_START_CHAT.md](QUICK_START_CHAT.md)
   - [CHAT_BACKEND_SETUP.md](CHAT_BACKEND_SETUP.md)

2. **Check the console:**
   - Backend: Look for errors in terminal
   - Frontend: Open browser DevTools (F12)

3. **Check the database:**
   - Run verification queries above
   - Look for error messages

4. **Test endpoints:**
   - Use `backend/test-chat-api.http`
   - Or use Postman/curl

5. **Create an issue:**
   - Include error messages
   - Include what you've tried
   - Include environment details

---

## 🎉 You're Done!

If all tests pass, your chat system is **fully integrated and working!**

### Next Steps:
1. Test with your team
2. Deploy to staging
3. Get user feedback
4. Deploy to production

**Congratulations! 🚀**
