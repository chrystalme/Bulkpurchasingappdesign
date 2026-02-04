# 💬 Chat Routes Specification

## Overview

The **Chat Routes** manage the messaging and communication system for the "Save Together, Buy Smarter" bulk purchasing application. The system includes Group Internal Chat (all members communicate) and Group-Vendor Chat (only admin sends, all read) for transparent negotiations.

---

## 🎯 What Chat Routes Are For

In your bulk purchasing app, **Chat** enables:

1. **Group Internal Chat** - Members communicate within the group
2. **Group-Vendor Chat** - Transparent negotiations (admin sends, all read)
3. **Direct Messages** - One-on-one conversations
4. **Real-time Communication** - WebSocket-based instant messaging
5. **Message History** - Complete conversation tracking
6. **File Sharing** - Share images and documents
7. **Typing Indicators** - Real-time presence

---

## 🏗️ Chat Architecture

### Base Route
```
/api/chat
```

### WebSocket Connection
```
ws://yourdomain.com/ws/chat
```

### Chat Types

**1. Group Internal Chat**
- **Purpose:** Group members communicate
- **Who can send:** All group members
- **Who can read:** All group members
- **Transparency:** Full visibility

**2. Group-Vendor Chat**
- **Purpose:** Negotiate with vendors
- **Who can send:** Only group admin (on behalf of all)
- **Who can read:** All group members + vendor
- **Transparency:** Prevents backdoor deals

**3. Direct Messages**
- **Purpose:** Private conversations
- **Who can send:** Both participants
- **Who can read:** Both participants only

---

## 📍 Complete Endpoint List

### Conversations (6 endpoints)
1. `GET /api/chat/conversations` - List all conversations
2. `GET /api/chat/conversations/:id` - Get conversation details
3. `POST /api/chat/conversations` - Create new conversation (DM)
4. `DELETE /api/chat/conversations/:id` - Delete/leave conversation
5. `PUT /api/chat/conversations/:id/mute` - Mute conversation
6. `PUT /api/chat/conversations/:id/read` - Mark as read

### Messages (8 endpoints)
7. `GET /api/chat/conversations/:id/messages` - Get messages
8. `POST /api/chat/conversations/:id/messages` - Send message
9. `PUT /api/chat/messages/:id` - Edit message
10. `DELETE /api/chat/messages/:id` - Delete message
11. `POST /api/chat/messages/:id/react` - React to message
12. `DELETE /api/chat/messages/:id/reactions/:reactionId` - Remove reaction
13. `POST /api/chat/messages/:id/forward` - Forward message
14. `POST /api/chat/conversations/:id/messages/bulk-delete` - Bulk delete messages

### Participants (3 endpoints)
15. `GET /api/chat/conversations/:id/participants` - Get participants
16. `POST /api/chat/conversations/:id/participants` - Add participants (group chat)
17. `DELETE /api/chat/conversations/:id/participants/:userId` - Remove participant

### Media & Files (3 endpoints)
18. `POST /api/chat/upload` - Upload file/image
19. `GET /api/chat/media/:id` - Get media file
20. `DELETE /api/chat/media/:id` - Delete media file

### Search (2 endpoints)
21. `GET /api/chat/search` - Search messages
22. `GET /api/chat/conversations/:id/search` - Search within conversation

### WebSocket Events (Real-time)
23. `WS: message.new` - New message received
24. `WS: message.edited` - Message edited
25. `WS: message.deleted` - Message deleted
26. `WS: typing.start` - User started typing
27. `WS: typing.stop` - User stopped typing
28. `WS: message.read` - Message read by user

---

## 📖 Detailed Endpoint Specifications

---

### 1. GET /api/chat/conversations

**Purpose:** List all conversations for authenticated user

**Authentication:** Required

**Query Parameters:**
- `type` (optional) - Filter by type: `group_internal`, `group_vendor`, `direct`
- `group_id` (optional) - Filter by specific group
- `unread_only` (optional, boolean) - Only unread conversations
- `archived` (optional, boolean) - Include/exclude archived
- `sort_by` (optional) - `last_message`, `created_at`, `unread_count`
- `limit` (optional) - Results per page (default: 20)
- `offset` (optional)

**Request Example:**
```http
GET /api/chat/conversations?type=group_internal&unread_only=true
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "conversations": [
    {
      "id": "uuid-conv-1",
      "type": "group_internal",
      "name": "Tech Enthusiasts - Internal",
      "avatar": "🖥️",
      
      "group": {
        "id": "uuid-group-1",
        "name": "Tech Enthusiasts",
        "avatar": "🖥️"
      },
      
      "participants": [
        {
          "user_id": "uuid-user-1",
          "name": "John Doe",
          "avatar": "https://...",
          "role": "admin",
          "is_online": true
        },
        {
          "user_id": "uuid-user-2",
          "name": "Jane Smith",
          "avatar": "https://...",
          "role": "member",
          "is_online": false,
          "last_seen": "2025-01-26T10:00:00Z"
        }
      ],
      
      "last_message": {
        "id": "uuid-msg-1",
        "sender": {
          "id": "uuid-user-1",
          "name": "John Doe",
          "avatar": "https://..."
        },
        "content": "Let's order 25 wireless mice",
        "type": "text",
        "timestamp": "2025-01-26T14:30:00Z"
      },
      
      "unread_count": 5,
      "muted": false,
      "archived": false,
      
      "permissions": {
        "can_send": true,
        "can_add_participants": false,
        "can_remove_participants": false,
        "can_delete": false
      },
      
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-01-26T14:30:00Z"
    },
    {
      "id": "uuid-conv-2",
      "type": "group_vendor",
      "name": "Tech Enthusiasts ↔ Tech Supplies Co",
      "avatar": "https://vendor-logo.jpg",
      
      "group": {
        "id": "uuid-group-1",
        "name": "Tech Enthusiasts",
        "admin": {
          "id": "uuid-user-1",
          "name": "John Doe"
        }
      },
      
      "vendor": {
        "id": "uuid-vendor-1",
        "name": "Tech Supplies Co",
        "logo": "https://...",
        "verified": true
      },
      
      "participants": [
        {
          "user_id": "uuid-user-1",
          "name": "John Doe",
          "role": "group_admin",
          "can_send": true
        },
        {
          "user_id": "uuid-user-2",
          "name": "Jane Smith",
          "role": "group_member",
          "can_send": false
        },
        {
          "user_id": "uuid-vendor-user",
          "name": "Tech Supplies Rep",
          "role": "vendor",
          "can_send": true
        }
      ],
      
      "last_message": {
        "id": "uuid-msg-2",
        "sender": {
          "id": "uuid-vendor-user",
          "name": "Tech Supplies Rep",
          "type": "vendor"
        },
        "content": "We can offer 40% discount for 25+ units",
        "type": "text",
        "timestamp": "2025-01-26T15:00:00Z"
      },
      
      "unread_count": 2,
      "muted": false,
      
      "permissions": {
        "can_send": true,
        "can_read": true,
        "can_add_participants": false
      },
      
      "transparency_note": "Only group admin can send messages. All members can read.",
      
      "created_at": "2025-01-20T11:00:00Z",
      "updated_at": "2025-01-26T15:00:00Z"
    },
    {
      "id": "uuid-conv-3",
      "type": "direct",
      "name": null,
      
      "participants": [
        {
          "user_id": "uuid-user-3",
          "name": "Bob Wilson",
          "avatar": "https://...",
          "is_online": true
        }
      ],
      
      "last_message": {
        "id": "uuid-msg-3",
        "sender": {
          "id": "uuid-user-3",
          "name": "Bob Wilson"
        },
        "content": "Thanks for the recommendation!",
        "type": "text",
        "timestamp": "2025-01-26T12:00:00Z"
      },
      
      "unread_count": 0,
      "muted": false,
      
      "permissions": {
        "can_send": true,
        "can_read": true,
        "can_delete": true
      },
      
      "created_at": "2025-01-25T09:00:00Z",
      "updated_at": "2025-01-26T12:00:00Z"
    }
  ],
  
  "summary": {
    "total_conversations": 15,
    "unread_conversations": 3,
    "total_unread_messages": 8
  },
  
  "pagination": {
    "total": 15,
    "limit": 20,
    "offset": 0
  }
}
```

**Business Logic:**

1. **Conversation Types:**
   - **group_internal:** Created automatically when group is created
   - **group_vendor:** Created when admin initiates vendor negotiation
   - **direct:** Created when users message each other

2. **Permissions:**
   - Group Internal: All members can send/read
   - Group-Vendor: Only admin sends, all read, vendor can send
   - Direct: Both participants can send/read

3. **Unread Count:**
   - Calculate messages sent after user's last_read_at
   - Exclude messages sent by user themselves

4. **Sorting:**
   - Default: Most recent activity first
   - Pinned conversations at top (future feature)

---

### 2. GET /api/chat/conversations/:id

**Purpose:** Get detailed conversation information

**Authentication:** Required

**URL Parameters:**
- `id` - Conversation UUID

**Response (200 OK):**
```json
{
  "id": "uuid-conv-2",
  "type": "group_vendor",
  "name": "Tech Enthusiasts ↔ Tech Supplies Co",
  
  "group": {
    "id": "uuid-group-1",
    "name": "Tech Enthusiasts",
    "avatar": "🖥️",
    "member_count": 12,
    "admin": {
      "id": "uuid-user-1",
      "name": "John Doe",
      "avatar": "https://..."
    }
  },
  
  "vendor": {
    "id": "uuid-vendor-1",
    "name": "Tech Supplies Co",
    "logo": "https://...",
    "verified": true,
    "rating": 4.8,
    "response_time": 120
  },
  
  "participants": [
    {
      "user_id": "uuid-user-1",
      "name": "John Doe",
      "avatar": "https://...",
      "role": "group_admin",
      "permissions": {
        "can_send": true,
        "can_read": true,
        "is_admin": true
      },
      "joined_at": "2025-01-20T11:00:00Z",
      "is_online": true
    },
    {
      "user_id": "uuid-user-2",
      "name": "Jane Smith",
      "avatar": "https://...",
      "role": "group_member",
      "permissions": {
        "can_send": false,
        "can_read": true,
        "is_admin": false
      },
      "joined_at": "2025-01-20T11:00:00Z",
      "is_online": false,
      "last_seen": "2025-01-26T10:00:00Z"
    },
    {
      "user_id": "uuid-vendor-user",
      "name": "Tech Supplies Rep",
      "avatar": "https://...",
      "role": "vendor",
      "permissions": {
        "can_send": true,
        "can_read": true,
        "is_vendor": true
      },
      "joined_at": "2025-01-20T11:00:00Z",
      "is_online": true
    }
  ],
  
  "rules": {
    "type": "group_vendor",
    "description": "Transparent negotiation chat. Only group admin can send messages on behalf of all members. All members can read all messages.",
    "who_can_send": ["group_admin", "vendor"],
    "who_can_read": ["all_members", "vendor"],
    "transparency_enabled": true
  },
  
  "statistics": {
    "total_messages": 45,
    "participants_count": 12,
    "active_participants": 8,
    "average_response_time": 180
  },
  
  "your_permissions": {
    "can_send": true,
    "can_read": true,
    "can_add_participants": false,
    "can_remove_participants": false,
    "can_delete_conversation": false,
    "can_mute": true
  },
  
  "settings": {
    "muted": false,
    "archived": false,
    "pinned": false,
    "notifications_enabled": true
  },
  
  "created_at": "2025-01-20T11:00:00Z",
  "created_by": {
    "id": "uuid-user-1",
    "name": "John Doe"
  },
  "updated_at": "2025-01-26T15:00:00Z"
}
```

**Business Logic:**
- Verify user is participant
- Load complete conversation details
- Calculate user's permissions
- Show conversation rules/type
- Include participant statuses

---

### 3. POST /api/chat/conversations

**Purpose:** Create a new conversation (Direct Message only, group chats auto-created)

**Authentication:** Required

**Request Body:**
```json
{
  "type": "direct",
  "participant_id": "uuid-user-3",
  "initial_message": "Hi, I saw you're in the Office Supplies group. Do you recommend the vendor?"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Conversation created",
  "conversation": {
    "id": "uuid-conv-new",
    "type": "direct",
    "participants": [
      {
        "user_id": "uuid-user-current",
        "name": "Current User"
      },
      {
        "user_id": "uuid-user-3",
        "name": "Bob Wilson"
      }
    ],
    "created_at": "2025-01-26T16:00:00Z"
  },
  "initial_message": {
    "id": "uuid-msg-new",
    "content": "Hi, I saw you're in the Office Supplies group...",
    "sent_at": "2025-01-26T16:00:00Z"
  }
}
```

**Business Logic:**

**Direct Messages:**
- Create conversation between two users
- Send initial message if provided
- Check if conversation already exists (return existing)

**Group Chats (Auto-created):**
- Group Internal: Created when group is created
- Group-Vendor: Created when admin initiates vendor negotiation

**Error Responses:**

**400 Bad Request:**
```json
{
  "error": "Conversation exists",
  "message": "A conversation with this user already exists",
  "conversation_id": "uuid-conv-existing"
}
```

---

### 7. GET /api/chat/conversations/:id/messages

**Purpose:** Get messages in a conversation

**Authentication:** Required

**URL Parameters:**
- `id` - Conversation UUID

**Query Parameters:**
- `before` (optional) - Get messages before this message ID (pagination)
- `after` (optional) - Get messages after this message ID
- `limit` (optional) - Number of messages (default: 50)
- `include_deleted` (optional, boolean) - Include deleted messages (admin only)

**Request Example:**
```http
GET /api/chat/conversations/uuid-conv-1/messages?limit=50
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "conversation_id": "uuid-conv-1",
  "messages": [
    {
      "id": "uuid-msg-1",
      "conversation_id": "uuid-conv-1",
      
      "sender": {
        "id": "uuid-user-1",
        "name": "John Doe",
        "avatar": "https://...",
        "role": "admin"
      },
      
      "content": "Let's order 25 wireless mice. I found a great deal!",
      "type": "text",
      
      "attachments": [],
      
      "reactions": [
        {
          "emoji": "👍",
          "users": [
            {
              "id": "uuid-user-2",
              "name": "Jane Smith"
            },
            {
              "id": "uuid-user-3",
              "name": "Bob Wilson"
            }
          ],
          "count": 2
        }
      ],
      
      "reply_to": null,
      
      "edited": false,
      "deleted": false,
      
      "read_by": [
        {
          "user_id": "uuid-user-2",
          "read_at": "2025-01-26T14:31:00Z"
        },
        {
          "user_id": "uuid-user-3",
          "read_at": "2025-01-26T14:35:00Z"
        }
      ],
      
      "sent_at": "2025-01-26T14:30:00Z",
      "delivered_at": "2025-01-26T14:30:01Z"
    },
    {
      "id": "uuid-msg-2",
      "conversation_id": "uuid-conv-1",
      
      "sender": {
        "id": "uuid-user-2",
        "name": "Jane Smith",
        "avatar": "https://...",
        "role": "member"
      },
      
      "content": "Great idea! Here's a photo of the one I'm using",
      "type": "text",
      
      "attachments": [
        {
          "id": "uuid-attach-1",
          "type": "image",
          "url": "https://storage.com/image-1.jpg",
          "thumbnail_url": "https://storage.com/thumb-1.jpg",
          "filename": "mouse-photo.jpg",
          "size": 1024000,
          "mime_type": "image/jpeg"
        }
      ],
      
      "reactions": [],
      
      "reply_to": {
        "message_id": "uuid-msg-1",
        "sender_name": "John Doe",
        "content": "Let's order 25 wireless mice..."
      },
      
      "edited": false,
      "deleted": false,
      
      "sent_at": "2025-01-26T14:35:00Z"
    },
    {
      "id": "uuid-msg-3",
      "conversation_id": "uuid-conv-1",
      
      "sender": {
        "id": "uuid-user-1",
        "name": "John Doe",
        "avatar": "https://..."
      },
      
      "content": "I've contacted the vendor for a quote",
      "type": "system",
      
      "system_data": {
        "action": "vendor_contacted",
        "vendor_id": "uuid-vendor-1",
        "vendor_name": "Tech Supplies Co"
      },
      
      "sent_at": "2025-01-26T14:40:00Z"
    }
  ],
  
  "pagination": {
    "has_more": true,
    "next_before": "uuid-msg-1",
    "total_messages": 150
  }
}
```

**Message Types:**
- `text`: Regular text message
- `image`: Image attachment
- `file`: File attachment
- `system`: System-generated message
- `order`: Order-related message
- `quote`: Price quote from vendor

**Business Logic:**

1. **Authorization:**
   - Verify user is participant
   - Check can_read permission

2. **Message Loading:**
   - Load recent messages (50 by default)
   - Paginate using before/after cursors
   - Include sender details
   - Load attachments

3. **Read Receipts:**
   - Show who read each message
   - Update last_read_at for user

4. **Formatting:**
   - Parse mentions (@username)
   - Format links
   - Handle replies

---

### 8. POST /api/chat/conversations/:id/messages

**Purpose:** Send a message in a conversation

**Authentication:** Required

**URL Parameters:**
- `id` - Conversation UUID

**Request Body:**
```json
{
  "content": "I agree! Let's proceed with the order.",
  "type": "text",
  "reply_to": "uuid-msg-2",
  "attachments": [
    "uuid-upload-1"
  ],
  "mentions": [
    "uuid-user-2"
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": {
    "id": "uuid-msg-new",
    "conversation_id": "uuid-conv-1",
    "sender": {
      "id": "uuid-user-current",
      "name": "Current User",
      "avatar": "https://..."
    },
    "content": "I agree! Let's proceed with the order.",
    "type": "text",
    "attachments": [
      {
        "id": "uuid-attach-1",
        "type": "image",
        "url": "https://storage.com/image-1.jpg",
        "thumbnail_url": "https://storage.com/thumb-1.jpg"
      }
    ],
    "reply_to": {
      "message_id": "uuid-msg-2",
      "sender_name": "Jane Smith",
      "content": "Great idea! Here's a photo..."
    },
    "sent_at": "2025-01-26T16:30:00Z",
    "delivered_at": "2025-01-26T16:30:01Z"
  }
}
```

**Business Logic:**

1. **Authorization:**
   - Verify user is participant
   - Check can_send permission
   - For group-vendor chats: Only admin can send

2. **Message Creation:**
   - Validate content (not empty, max 10,000 chars)
   - Link attachments (uploaded via /upload endpoint)
   - Process mentions
   - Link reply_to message

3. **Real-time Delivery:**
   - Send via WebSocket to all online participants
   - Store in database
   - Update conversation's updated_at

4. **Notifications:**
   - Notify offline participants
   - Send push notifications
   - Email notifications (if enabled)
   - Increment unread count

5. **Special Handling:**
   - Group-Vendor Chat: Tag message as "From Admin (on behalf of group)"
   - Direct messages: Mark as private

**Error Responses:**

**403 Forbidden - Group-Vendor Chat:**
```json
{
  "error": "Permission denied",
  "message": "Only group admin can send messages in vendor negotiations",
  "conversation_type": "group_vendor",
  "admin_id": "uuid-user-1"
}
```

**400 Bad Request:**
```json
{
  "error": "Invalid content",
  "message": "Message content cannot be empty"
}
```

---

### 9. PUT /api/chat/messages/:id

**Purpose:** Edit a sent message

**Authentication:** Required

**URL Parameters:**
- `id` - Message UUID

**Request Body:**
```json
{
  "content": "Updated message content"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": {
    "id": "uuid-msg-1",
    "content": "Updated message content",
    "edited": true,
    "edited_at": "2025-01-26T16:45:00Z",
    "original_content": "Original message content"
  }
}
```

**Business Logic:**
- Only sender can edit
- Only within 15 minutes of sending
- Mark as edited
- Store edit history
- Notify via WebSocket

**Edit Time Limit:** 15 minutes after sending

---

### 10. DELETE /api/chat/messages/:id

**Purpose:** Delete a message

**Authentication:** Required

**Request Body (optional):**
```json
{
  "delete_for": "everyone"
}
```

**Delete Options:**
- `me`: Delete only for yourself (hide message)
- `everyone`: Delete for all participants (only within 15 min, or if sender)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Message deleted",
  "deleted_for": "everyone"
}
```

**Business Logic:**
- Sender can delete for everyone (within 15 min)
- Anyone can delete for themselves
- Soft delete (mark as deleted)
- Replace content with "[Message deleted]"
- Notify via WebSocket

---

### 11. POST /api/chat/messages/:id/react

**Purpose:** React to a message with an emoji

**Authentication:** Required

**Request Body:**
```json
{
  "emoji": "👍"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "reaction": {
    "message_id": "uuid-msg-1",
    "emoji": "👍",
    "user_id": "uuid-user-current",
    "created_at": "2025-01-26T17:00:00Z"
  }
}
```

**Supported Emojis:**
- 👍 👎 ❤️ 😂 😮 😢 🎉 🔥

**Business Logic:**
- Add reaction to message
- One reaction per user per message
- If same emoji exists, remove it (toggle)
- Update via WebSocket

---

### 18. POST /api/chat/upload

**Purpose:** Upload a file or image for chat

**Authentication:** Required

**Request:** `multipart/form-data`

**Form Fields:**
- `file`: File to upload
- `conversation_id`: Conversation UUID

**Response (201 Created):**
```json
{
  "success": true,
  "upload": {
    "id": "uuid-upload-1",
    "type": "image",
    "url": "https://storage.com/image-1.jpg",
    "thumbnail_url": "https://storage.com/thumb-1.jpg",
    "filename": "photo.jpg",
    "size": 1024000,
    "mime_type": "image/jpeg",
    "uploaded_at": "2025-01-26T17:10:00Z"
  }
}
```

**File Limits:**
- **Images:** Max 10MB, formats: JPG, PNG, GIF, WEBP
- **Files:** Max 25MB, formats: PDF, DOC, DOCX, XLS, XLSX, TXT

**Business Logic:**
- Validate file type and size
- Generate thumbnail for images
- Store in cloud storage (AWS S3, etc.)
- Return upload ID to use in message

---

### 21. GET /api/chat/search

**Purpose:** Search messages across all conversations

**Authentication:** Required

**Query Parameters:**
- `q` (required) - Search query
- `conversation_id` (optional) - Search within specific conversation
- `type` (optional) - Filter by conversation type
- `from_user` (optional) - Filter by sender
- `has_attachments` (optional, boolean)
- `date_from` (optional)
- `date_to` (optional)
- `limit` (optional)

**Response (200 OK):**
```json
{
  "query": "wireless mouse",
  "results": [
    {
      "message": {
        "id": "uuid-msg-1",
        "content": "Let's order 25 wireless mice",
        "sender": {
          "name": "John Doe"
        },
        "sent_at": "2025-01-26T14:30:00Z"
      },
      "conversation": {
        "id": "uuid-conv-1",
        "name": "Tech Enthusiasts - Internal",
        "type": "group_internal"
      },
      "highlight": "Let's order 25 <mark>wireless mice</mark>",
      "match_score": 0.95
    }
  ],
  "total": 15
}
```

---

## 🌐 WebSocket Events

### Connection
```javascript
// Client connects
const ws = new WebSocket('ws://domain.com/ws/chat?token=<jwt>');

// Server authenticates and sends connection success
{
  "event": "connected",
  "user_id": "uuid-user-1",
  "timestamp": "2025-01-26T17:00:00Z"
}
```

### Message Events

**1. New Message**
```json
{
  "event": "message.new",
  "conversation_id": "uuid-conv-1",
  "message": {
    "id": "uuid-msg-new",
    "sender": {
      "id": "uuid-user-2",
      "name": "Jane Smith",
      "avatar": "https://..."
    },
    "content": "New message content",
    "sent_at": "2025-01-26T17:05:00Z"
  }
}
```

**2. Message Edited**
```json
{
  "event": "message.edited",
  "conversation_id": "uuid-conv-1",
  "message_id": "uuid-msg-1",
  "new_content": "Updated content",
  "edited_at": "2025-01-26T17:06:00Z"
}
```

**3. Message Deleted**
```json
{
  "event": "message.deleted",
  "conversation_id": "uuid-conv-1",
  "message_id": "uuid-msg-1",
  "deleted_by": "uuid-user-1",
  "deleted_at": "2025-01-26T17:07:00Z"
}
```

**4. Typing Indicator**
```json
{
  "event": "typing.start",
  "conversation_id": "uuid-conv-1",
  "user": {
    "id": "uuid-user-2",
    "name": "Jane Smith"
  }
}

{
  "event": "typing.stop",
  "conversation_id": "uuid-conv-1",
  "user_id": "uuid-user-2"
}
```

**5. Message Read**
```json
{
  "event": "message.read",
  "conversation_id": "uuid-conv-1",
  "message_id": "uuid-msg-1",
  "read_by": "uuid-user-3",
  "read_at": "2025-01-26T17:08:00Z"
}
```

**6. User Status**
```json
{
  "event": "user.online",
  "user_id": "uuid-user-2",
  "timestamp": "2025-01-26T17:09:00Z"
}

{
  "event": "user.offline",
  "user_id": "uuid-user-2",
  "last_seen": "2025-01-26T17:10:00Z"
}
```

---

## 🗄️ Database Tables

### conversations
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('group_internal', 'group_vendor', 'direct')),
  
  name VARCHAR(200),
  avatar VARCHAR(500),
  
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id),
  
  created_by UUID NOT NULL REFERENCES users(id),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversations_group ON conversations(group_id);
CREATE INDEX idx_conversations_vendor ON conversations(vendor_id);
CREATE INDEX idx_conversations_type ON conversations(type);
```

### conversation_participants
```sql
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member', 'vendor')),
  
  can_send BOOLEAN DEFAULT true,
  can_read BOOLEAN DEFAULT true,
  
  muted BOOLEAN DEFAULT false,
  archived BOOLEAN DEFAULT false,
  
  last_read_at TIMESTAMP,
  unread_count INT DEFAULT 0,
  
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP,
  
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_conv_participants_conv ON conversation_participants(conversation_id);
CREATE INDEX idx_conv_participants_user ON conversation_participants(user_id);
```

### messages
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  
  content TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'system', 'order', 'quote')),
  
  reply_to UUID REFERENCES messages(id),
  
  edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP,
  original_content TEXT,
  
  deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES users(id),
  
  system_data JSONB,
  
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at);
CREATE INDEX idx_messages_content ON messages USING GIN(to_tsvector('english', content));
```

### message_attachments
```sql
CREATE TABLE message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  
  type VARCHAR(20) NOT NULL CHECK (type IN ('image', 'file', 'video', 'audio')),
  url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  
  filename VARCHAR(255),
  size BIGINT,
  mime_type VARCHAR(100),
  
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### message_reactions
```sql
CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  emoji VARCHAR(10) NOT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(message_id, user_id, emoji)
);
```

### message_read_receipts
```sql
CREATE TABLE message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(message_id, user_id)
);
```

---

## 🔐 Chat Permissions Matrix

| Chat Type | Who Can Send | Who Can Read | Transparency |
|-----------|-------------|--------------|--------------|
| **Group Internal** | All members | All members | Full |
| **Group-Vendor** | Admin + Vendor | All members + Vendor | Full (prevents backdoor deals) |
| **Direct Message** | Both participants | Both participants | Private |

---

## 🎯 Business Rules

### Group-Vendor Chat Rules
1. **Only admin sends:** Prevents individual members from making side deals
2. **All members read:** Complete transparency of negotiations
3. **Admin represents group:** Messages tagged as "From Admin (on behalf of group)"
4. **Vendor can respond:** Normal vendor communication
5. **No private channels:** All negotiations visible to all members

### Message Retention
- Messages stored indefinitely
- Deleted messages: Soft delete (marked as deleted)
- Attachments: Stored for 1 year
- Export available for admins

### Rate Limiting
- Max 60 messages per minute per user
- Max 10 attachments per message
- Max file size: 25MB

---

## 🎉 Summary

The **Chat Routes** provide complete messaging with:

- ✅ **Group Internal Chat** - Members communicate freely
- ✅ **Group-Vendor Chat** - Transparent negotiations (admin sends, all read)
- ✅ **Direct Messages** - Private conversations
- ✅ **Real-time** - WebSocket-based instant messaging
- ✅ **Rich Features** - Reactions, replies, attachments
- ✅ **Search** - Find messages across conversations
- ✅ **Transparency** - Prevents backdoor deals
- ✅ **File Sharing** - Images and documents

All endpoints support secure, transparent communication! 💬
