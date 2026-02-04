# Chat API Documentation

This document provides comprehensive documentation for the real-time chat system built with WebSocket (Socket.IO) and REST API endpoints.

## Table of Contents

1. [Overview](#overview)
2. [WebSocket Connection](#websocket-connection)
3. [REST API Endpoints](#rest-api-endpoints)
4. [WebSocket Events](#websocket-events)
5. [Usage Examples](#usage-examples)
6. [Best Practices](#best-practices)

---

## Overview

The chat system enables real-time communication between vendors and members. It uses:
- **REST API** for persistent operations (creating conversations, fetching history)
- **WebSocket (Socket.IO)** for real-time messaging, typing indicators, and presence

### Key Features

- Real-time messaging between vendors and members
- Typing indicators
- Read receipts
- Message history with pagination
- Unread message counts
- Online/offline presence
- Conversation management (archive, list)
- Product-specific conversations

---

## WebSocket Connection

### Client Setup

Install Socket.IO client:
```bash
npm install socket.io-client
```

### Connect to WebSocket

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: {
    token: 'YOUR_JWT_TOKEN' // Get this from login response
  },
  transports: ['websocket']
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to chat server');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});

socket.on('disconnect', () => {
  console.log('Disconnected from chat server');
});
```

### Authentication

The WebSocket connection requires JWT authentication. Pass the token in the `auth` object when connecting. The token should be the same one received from `/api/auth/login`.

---

## REST API Endpoints

All REST endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### 1. Get All Conversations

**Endpoint:** `GET /api/chat/conversations`

**Description:** Retrieve all active conversations for the authenticated user.

**Response:**
```json
[
  {
    "id": 1,
    "vendor_id": 5,
    "member_id": 10,
    "product_id": 3,
    "status": "active",
    "last_message_at": "2026-01-24T10:30:00Z",
    "created_at": "2026-01-20T08:00:00Z",
    "vendor_name": "John Doe",
    "vendor_avatar": null,
    "vendor_business_name": "Solar Solutions Inc",
    "vendor_rating": 4.5,
    "vendor_verified": true,
    "product_name": "Lithium Battery Pack",
    "product_image": "battery.jpg",
    "last_message": "Is this product still available?",
    "unread_count": 2
  }
]
```

**For Vendors:** Returns conversations where they are the vendor.
**For Members:** Returns conversations where they are the member.

---

### 2. Create or Get Conversation

**Endpoint:** `POST /api/chat/conversations`

**Description:** Create a new conversation or return an existing one between a vendor and member for a specific product.

**Request Body:**
```json
{
  "vendorId": 5,
  "productId": 3
}
```

**Response:**
```json
{
  "id": 1,
  "vendor_id": 5,
  "member_id": 10,
  "product_id": 3,
  "status": "active",
  "last_message_at": "2026-01-24T10:30:00Z",
  "created_at": "2026-01-20T08:00:00Z"
}
```

**Notes:**
- Only members can create conversations (not vendors)
- If a conversation already exists for the same vendor, member, and product, it returns the existing one

---

### 3. Get Messages for a Conversation

**Endpoint:** `GET /api/chat/conversations/:conversationId/messages`

**Description:** Retrieve message history for a specific conversation.

**Query Parameters:**
- `limit` (optional, default: 50) - Number of messages to retrieve
- `offset` (optional, default: 0) - Offset for pagination

**Response:**
```json
[
  {
    "id": 101,
    "conversation_id": 1,
    "sender_id": 10,
    "message_text": "Is this product still available?",
    "is_read": true,
    "created_at": "2026-01-24T10:30:00Z",
    "sender_name": "Alice Smith",
    "sender_avatar": null
  },
  {
    "id": 102,
    "conversation_id": 1,
    "sender_id": 5,
    "message_text": "Yes! We have 50 units in stock.",
    "is_read": false,
    "created_at": "2026-01-24T10:32:00Z",
    "sender_name": "John Doe",
    "sender_avatar": null
  }
]
```

**Notes:**
- Messages are returned in chronological order (oldest first)
- Only participants of the conversation can access messages

---

### 4. Send a Message

**Endpoint:** `POST /api/chat/conversations/:conversationId/messages`

**Description:** Send a message in a conversation.

**Request Body:**
```json
{
  "messageText": "Thank you! Can I get a bulk discount?"
}
```

**Response:**
```json
{
  "id": 103,
  "conversation_id": 1,
  "sender_id": 10,
  "message_text": "Thank you! Can I get a bulk discount?",
  "is_read": false,
  "created_at": "2026-01-24T10:35:00Z",
  "sender_name": "Alice Smith",
  "sender_avatar": null
}
```

**Notes:**
- The message is also broadcast via WebSocket to all connected clients in the conversation
- The recipient receives a notification if they're online but not in the conversation room

---

### 5. Mark Messages as Read

**Endpoint:** `PUT /api/chat/conversations/:conversationId/messages/read`

**Description:** Mark all unread messages in a conversation as read.

**Response:**
```json
{
  "success": true,
  "messagesMarkedRead": 3
}
```

**Notes:**
- Only marks messages from other users as read (not your own)
- Notifies the sender via WebSocket that their messages were read

---

### 6. Archive a Conversation

**Endpoint:** `PUT /api/chat/conversations/:conversationId/archive`

**Description:** Archive a conversation (hide it from active conversations list).

**Response:**
```json
{
  "success": true
}
```

---

### 7. Get Unread Message Count

**Endpoint:** `GET /api/chat/unread-count`

**Description:** Get the total count of unread messages across all conversations.

**Response:**
```json
{
  "unreadCount": 5
}
```

---

## WebSocket Events

### Events You Can Emit (Client → Server)

#### 1. Join a Conversation

**Event:** `chat:join_conversation`

**Payload:**
```javascript
socket.emit('chat:join_conversation', {
  conversationId: 1
});
```

**Description:** Join a conversation room to receive real-time messages.

**Server Response:** `chat:joined_conversation`

---

#### 2. Leave a Conversation

**Event:** `chat:leave_conversation`

**Payload:**
```javascript
socket.emit('chat:leave_conversation', {
  conversationId: 1
});
```

---

#### 3. Start Typing Indicator

**Event:** `chat:typing_start`

**Payload:**
```javascript
socket.emit('chat:typing_start', {
  conversationId: 1
});
```

**Description:** Notify other users in the conversation that you're typing.

---

#### 4. Stop Typing Indicator

**Event:** `chat:typing_stop`

**Payload:**
```javascript
socket.emit('chat:typing_stop', {
  conversationId: 1
});
```

---

#### 5. Send a Message (Alternative to REST)

**Event:** `chat:send_message`

**Payload:**
```javascript
socket.emit('chat:send_message', {
  conversationId: 1,
  messageText: 'Hello!'
});
```

**Description:** Send a message via WebSocket (also saves to database).

**Server Response:** `chat:message_received`

---

#### 6. Mark Messages as Read

**Event:** `chat:mark_read`

**Payload:**
```javascript
socket.emit('chat:mark_read', {
  conversationId: 1,
  messageIds: [101, 102, 103] // Optional, marks all if not provided
});
```

---

#### 7. Get Chat History

**Event:** `chat:get_history`

**Payload:**
```javascript
socket.emit('chat:get_history', {
  conversationId: 1,
  limit: 50,
  offset: 0
});
```

**Server Response:** `chat:history`

---

### Events You Can Listen To (Server → Client)

#### 1. User Online

**Event:** `user:online`

**Payload:**
```javascript
{
  userId: 5,
  userName: "John Doe"
}
```

---

#### 2. User Offline

**Event:** `user:offline`

**Payload:**
```javascript
{
  userId: 5
}
```

---

#### 3. New Conversation

**Event:** `conversation:new`

**Payload:**
```javascript
{
  conversation: { /* conversation object */ },
  memberName: "Alice Smith"
}
```

**Description:** Notifies vendors when a member initiates a new conversation.

---

#### 4. Message Received

**Event:** `chat:message_received`

**Payload:**
```javascript
{
  id: 103,
  conversation_id: 1,
  sender_id: 10,
  message_text: "Hello!",
  is_read: false,
  created_at: "2026-01-24T10:35:00Z",
  sender_name: "Alice Smith",
  sender_avatar: null
}
```

**Description:** Real-time message delivery in a conversation room.

---

#### 5. New Message Notification

**Event:** `chat:new_message_notification`

**Payload:**
```javascript
{
  conversationId: 1,
  message: { /* message object */ },
  senderName: "Alice Smith"
}
```

**Description:** Notification when you receive a message but you're not in the conversation room.

---

#### 6. User Typing

**Event:** `chat:user_typing`

**Payload:**
```javascript
{
  userId: 5,
  userName: "John Doe",
  conversationId: 1
}
```

---

#### 7. User Stopped Typing

**Event:** `chat:user_stopped_typing`

**Payload:**
```javascript
{
  userId: 5,
  conversationId: 1
}
```

---

#### 8. Messages Read

**Event:** `chat:messages_read`

**Payload:**
```javascript
{
  conversationId: 1,
  messageIds: [101, 102],
  readBy: 10
}
```

**Description:** Notifies you when the other party reads your messages.

---

#### 9. Chat History

**Event:** `chat:history`

**Payload:**
```javascript
{
  conversationId: 1,
  messages: [ /* array of messages */ ],
  hasMore: true
}
```

---

#### 10. Error

**Event:** `error`

**Payload:**
```javascript
{
  message: "Access denied to this conversation",
  event: "chat:join_conversation"
}
```

---

## Usage Examples

### Complete Chat Implementation (React)

```javascript
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

function ChatComponent({ conversationId, token }) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Initialize WebSocket connection
  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      auth: { token },
      transports: ['websocket']
    });

    newSocket.on('connect', () => {
      console.log('Connected to chat');
      // Join the conversation room
      newSocket.emit('chat:join_conversation', { conversationId });
    });

    // Listen for new messages
    newSocket.on('chat:message_received', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Listen for typing indicators
    newSocket.on('chat:user_typing', ({ userName }) => {
      setIsTyping(true);
    });

    newSocket.on('chat:user_stopped_typing', () => {
      setIsTyping(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('chat:leave_conversation', { conversationId });
      newSocket.close();
    };
  }, [conversationId, token]);

  // Send message
  const sendMessage = () => {
    if (!messageText.trim()) return;

    socket.emit('chat:send_message', {
      conversationId,
      messageText
    });

    setMessageText('');
  };

  // Handle typing
  let typingTimeout;
  const handleTyping = () => {
    socket.emit('chat:typing_start', { conversationId });
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit('chat:typing_stop', { conversationId });
    }, 1000);
  };

  return (
    <div>
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id}>
            <strong>{msg.sender_name}:</strong> {msg.message_text}
          </div>
        ))}
        {isTyping && <div>Other user is typing...</div>}
      </div>
      
      <input
        value={messageText}
        onChange={(e) => {
          setMessageText(e.target.value);
          handleTyping();
        }}
        placeholder="Type a message..."
      />
      
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}
```

---

### Fetch Conversations List

```javascript
async function fetchConversations(token) {
  const response = await fetch('http://localhost:3001/api/chat/conversations', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const conversations = await response.json();
  return conversations;
}
```

---

### Create a New Conversation

```javascript
async function createConversation(token, vendorId, productId) {
  const response = await fetch('http://localhost:3001/api/chat/conversations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ vendorId, productId })
  });
  
  const conversation = await response.json();
  return conversation;
}
```

---

## Best Practices

### 1. Connection Management

- **Reuse WebSocket connections** - Don't create multiple connections
- **Handle reconnection** - Implement exponential backoff for reconnection attempts
- **Clean up on unmount** - Always disconnect when components unmount

### 2. Message Delivery

- **Use REST API for persistence** - The REST endpoint ensures messages are saved even if WebSocket fails
- **Use WebSocket for real-time** - For instant delivery to online users
- **Handle offline scenarios** - Check if messages are delivered when users come back online

### 3. Performance

- **Paginate message history** - Don't load all messages at once
- **Lazy load conversations** - Load conversation list on demand
- **Throttle typing indicators** - Limit how often typing events are sent

### 4. Security

- **Always authenticate** - Use JWT tokens for both REST and WebSocket
- **Validate permissions** - Server verifies user access to conversations
- **Sanitize inputs** - Clean message text before saving/displaying

### 5. User Experience

- **Show read receipts** - Let users know when messages are read
- **Display online status** - Show when vendors/members are online
- **Typing indicators** - Give feedback when the other party is typing
- **Unread counts** - Display badge counts for unread messages
- **Sound notifications** - Optional audio alerts for new messages

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Authentication token required` | No token provided | Pass JWT in socket auth |
| `Invalid authentication token` | Token expired or invalid | Refresh token and reconnect |
| `Access denied to this conversation` | User not part of conversation | Verify conversation participants |
| `Failed to send message` | Message text empty or validation failed | Check message text |
| `Connection error` | Server unavailable | Implement retry logic |

### Example Error Handling

```javascript
socket.on('error', (error) => {
  console.error('Chat error:', error.message);
  
  if (error.message.includes('authentication')) {
    // Refresh token and reconnect
    refreshTokenAndReconnect();
  } else {
    // Show error to user
    showErrorNotification(error.message);
  }
});
```

---

## Database Schema

### Conversations Table

```sql
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER REFERENCES users(id),
  member_id INTEGER REFERENCES users(id),
  product_id INTEGER REFERENCES products(id),
  status VARCHAR(50) DEFAULT 'active',
  last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(vendor_id, member_id, product_id)
);
```

### Messages Table

```sql
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id),
  sender_id INTEGER REFERENCES users(id),
  message_text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Support

For issues or questions:
1. Check the [main README](/server/README.md)
2. Review the [Quick Reference Guide](/server/QUICK_REFERENCE.md)
3. See [API Examples](/server/API_EXAMPLES.md)

---

**Last Updated:** January 24, 2026
