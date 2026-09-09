# 🔄 Server → Backend Migration Guide

## Overview

You have an existing `/server` folder with a well-structured ES6 module-based backend. This guide will help you:

1. ✅ Rename `/server` to `/backend`
2. ✅ Integrate group chat functionality
3. ✅ Preserve all existing functionality
4. ✅ Update all references

---

## 📋 Current Structure Analysis

### What You Have:
```
/server/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   └── socket.js           ← Already has Socket.IO
│   ├── db/
│   │   ├── migrations/
│   │   ├── migrate.js
│   │   ├── seed.js
│   │   └── schema.sql
│   ├── middleware/
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── chat.routes.js      ← Existing 1-1 vendor chat
│   │   ├── escrow.routes.js
│   │   └── ...
│   ├── websocket/
│   └── server.js                ← ES6 modules
├── package.json
└── .env (assumed)
```

**Key Points:**
- ✅ Uses ES6 modules (`import/export`)
- ✅ Already has Socket.IO configured
- ✅ Has direct member-vendor chat working
- ✅ Well-organized structure

---

## 🚀 Step-by-Step Migration

### Step 1: Rename Folder

```bash
# In your project root
mv server backend
```

**That's it!** Since all paths are relative, nothing breaks.

---

### Step 2: Add Group Chat Migration

The new migration has been created at:
```
/server/src/db/migrations/006_add_group_chat.sql
```

This migration:
- ✅ Adds `conversation_type` column to existing `conversations` table
- ✅ Adds `group_id`, `title`, `avatar` columns
- ✅ Creates `group_conversation_participants` table
- ✅ Creates triggers for auto-creating group chats
- ✅ **Preserves all existing data** (backfills)
- ✅ Creates internal chats for existing groups

**Run the migration:**

```bash
cd backend
npm run migrate  # This should run all migrations including the new one
```

**Or manually:**

```bash
psql -U postgres -d bulk_purchasing_db -f src/db/migrations/006_add_group_chat.sql
```

---

### Step 3: Update Chat Routes

**Option A: Replace completely (recommended)**

```bash
cd backend/src/routes
mv chat.routes.js chat.routes.backup.js
mv chat.routes.enhanced.js chat.routes.js
```

**Option B: Merge manually**

Keep your existing `chat.routes.js` and add the new group endpoints:
- `POST /conversations/group-vendor`
- Update `GET /conversations` to include group chats
- Update message endpoints to handle group permissions

---

### Step 4: Update Frontend Environment

Update your frontend `.env`:

```env
# OLD (if you had this)
VITE_API_URL=http://localhost:3001/api

# NEW (keep it the same, just verify)
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
```

---

### Step 5: Update Socket.IO Handlers (Optional Enhancement)

Your existing `/server/src/config/socket.js` already handles:
- ✅ Authentication
- ✅ User rooms
- ✅ Conversation rooms
- ✅ Typing indicators

**It already works!** But you can enhance it with group-specific events:

Add to `/backend/src/config/socket.js` (after line 70):

```javascript
// Handle group chat events
socket.on('group:join', ({ groupId }) => {
  // Join all group conversation rooms
  pool.query(
    `SELECT id FROM conversations WHERE group_id = $1 AND conversation_type IN ('group-internal', 'group-vendor')`,
    [groupId]
  ).then(result => {
    result.rows.forEach(row => {
      socket.join(`conversation:${row.id}`);
    });
    console.log(`👥 User ${socket.userId} joined group ${groupId} conversations`);
  });
});
```

---

## 🧪 Testing the Migration

### Test 1: Verify Migration Ran

```bash
psql -U postgres -d bulk_purchasing_db
```

```sql
-- Check new columns exist
\d conversations

-- Should show:
-- - conversation_type column
-- - group_id column
-- - title column

-- Check new table exists
\d group_conversation_participants

-- Check triggers exist
SELECT tgname FROM pg_trigger WHERE tgname LIKE '%group_chat%';
```

### Test 2: Verify Internal Chats Created

```sql
-- Check if internal chats were created for existing groups
SELECT 
  c.id,
  c.conversation_type,
  c.title,
  g.name as group_name
FROM conversations c
JOIN groups g ON c.group_id = g.id
WHERE c.conversation_type = 'group-internal';
```

You should see one internal chat per group!

### Test 3: Test API Endpoints

```bash
# Get conversations (should include group chats now)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/chat/conversations

# Create group-vendor conversation
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"groupId":"GROUP_ID","vendorId":"VENDOR_ID"}' \
  http://localhost:3001/api/chat/conversations/group-vendor
```

### Test 4: Test Real-Time

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `npm run dev`
3. Login as group admin
4. Go to Groups → Select group → Chat tab
5. Send message in internal chat
6. Open another browser as different member
7. Message should appear instantly!

---

## 📝 What Changed vs What Stayed

### ✅ Stays the Same (No Breaking Changes)

- **Direct member-vendor chats** still work exactly as before
- **All existing conversations** preserved with `conversation_type = 'direct'`
- **All existing messages** unchanged
- **WebSocket connections** work the same
- **Authentication** unchanged
- **Database connection** unchanged
- **All other routes** (auth, products, escrow, etc.) unchanged

### ✨ What's New

- **Group internal chats** - All members can chat with each other
- **Group-vendor chats** - Admin negotiates, all members can see
- **Auto-created chats** - Internal chat created when group is created
- **Auto-add members** - Members auto-added when they join group
- **Permission system** - `can_send` for group-vendor chats (admin only)
- **Conversation types** - `direct`, `group-internal`, `group-vendor`

---

## 🔧 Configuration Checklist

### Backend `.env` Check

Make sure you have:

```env
# Server
NODE_ENV=development
PORT=3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bulk_purchasing_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_secret_key

# CORS
CORS_ORIGIN=http://localhost:5173
```

### Package.json Check

Your `/backend/package.json` already has everything needed:
- ✅ express
- ✅ pg
- ✅ socket.io
- ✅ jsonwebtoken
- ✅ cors
- ✅ express-validator

**No new dependencies needed!**

---

## 📊 Database Schema Changes

### Before Migration:
```sql
conversations
├─ id
├─ vendor_id
├─ member_id
├─ product_id
├─ status
└─ timestamps
```

### After Migration:
```sql
conversations
├─ id
├─ conversation_type        ← NEW (direct, group-internal, group-vendor)
├─ vendor_id
├─ member_id
├─ group_id                 ← NEW (for group chats)
├─ product_id
├─ title                    ← NEW (chat title)
├─ avatar                   ← NEW (chat avatar)
├─ status
└─ timestamps

group_conversation_participants  ← NEW TABLE
├─ conversation_id
├─ user_id
├─ role (admin, member, vendor)
├─ can_send
├─ last_read_at
└─ timestamps

typing_indicators           ← NEW TABLE
├─ conversation_id
├─ user_id
└─ expires_at
```

---

## 🎯 Frontend Integration Points

### Update Chat Components

Replace your chat components to use the new backend:

```typescript
// Use the new ChatDashboardReal component
import { ChatDashboardReal } from './components/chat/ChatDashboardReal';

// In App.tsx
case 'chat-dashboard':
  return <ChatDashboardReal navigate={navigate} />;
```

### API Calls

The frontend components I provided will call:

```typescript
// Get all conversations (includes groups now)
GET /api/chat/conversations

// Get group conversations only
GET /api/chat/conversations?type=group-internal

// Get group-vendor conversations
GET /api/chat/conversations?type=group-vendor

// Create group-vendor conversation
POST /api/chat/conversations/group-vendor
{
  groupId: 'uuid',
  vendorId: 'uuid',
  productId: 'uuid' // optional
}

// Send message (works for all types)
POST /api/chat/conversations/:id/messages
{
  messageText: 'Hello!'
}
```

---

## 🚨 Potential Issues & Solutions

### Issue 1: Migration Fails - "groups table doesn't exist"

**Cause:** Groups table not created yet

**Fix:**
```bash
# Create groups table first
psql -U postgres -d bulk_purchasing_db -f src/db/schema.sql
# Then run chat migration
psql -U postgres -d bulk_purchasing_db -f src/db/migrations/006_add_group_chat.sql
```

### Issue 2: "Cannot find module 'chat.routes.enhanced.js'"

**Cause:** File not renamed

**Fix:**
```bash
cd backend/src/routes
mv chat.routes.enhanced.js chat.routes.js
```

### Issue 3: Existing chats show as NULL type

**Cause:** Migration didn't run backfill

**Fix:**
```sql
UPDATE conversations SET conversation_type = 'direct' WHERE conversation_type IS NULL;
```

### Issue 4: Frontend can't connect to Socket.IO

**Cause:** URL mismatch

**Fix:**
```env
# In frontend/.env
VITE_SOCKET_URL=http://localhost:3001  # Match your backend port
```

---

## ✅ Migration Complete Checklist

- [ ] Renamed `/server` to `/backend`
- [ ] Ran migration `006_add_group_chat.sql`
- [ ] Verified new tables created (`group_conversation_participants`, `typing_indicators`)
- [ ] Verified triggers created
- [ ] Updated `chat.routes.js` with enhanced version
- [ ] Tested backend starts without errors
- [ ] Tested API endpoints return data
- [ ] Frontend connects to Socket.IO
- [ ] Can create group-vendor conversations
- [ ] Internal chats auto-created for groups
- [ ] Real-time messaging works

---

## 📞 Quick Commands Reference

```bash
# Rename folder
mv server backend

# Run migration
cd backend
npm run migrate

# Start backend
npm run dev

# Test migration
psql -U postgres -d bulk_purchasing_db -c "\d conversations"
psql -U postgres -d bulk_purchasing_db -c "\d group_conversation_participants"

# Test API
curl -H "Authorization: Bearer TOKEN" http://localhost:3001/api/chat/conversations

# Check logs
# Look for:
# ✅ User connected
# 🔌 Socket.IO initialized
# 📡 Server running on: http://localhost:3001
```

---

## 🎉 Success Criteria

Your migration is successful when:

1. ✅ Backend starts on port 3001
2. ✅ Socket.IO connects (check browser console)
3. ✅ `/api/chat/conversations` returns both direct and group chats
4. ✅ Can create group-vendor conversations
5. ✅ Internal chats exist for all groups
6. ✅ Real-time messaging works in group chats
7. ✅ Existing direct chats still work
8. ✅ No database errors

---

## 🚀 Next Steps

After migration:

1. **Test thoroughly** with multiple users
2. **Update frontend** to use ChatDashboardReal component
3. **Deploy** to staging environment
4. **Gather feedback** from users
5. **Monitor** database performance

---

## 📚 Related Documentation

- [INSTALLATION_STEPS.md](INSTALLATION_STEPS.md) - Detailed setup
- [CHAT_BACKEND_SETUP.md](CHAT_BACKEND_SETUP.md) - Full API reference
- [QUICK_START_CHAT.md](QUICK_START_CHAT.md) - Quick start guide

---

**You're ready! The migration preserves everything and adds powerful group chat features! 🎊**
