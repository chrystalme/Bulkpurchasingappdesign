# Chat System - Frontend Implementation

## Overview
This document describes the **dual-stream chat system** implemented with mock data for testing before backend integration.

## Two Chat Types

### 1. **Group Member Chat** 🏘️
- **Purpose**: Members of a purchasing group chat among themselves
- **Features**:
  - Multi-participant conversations (3-10+ members)
  - Group member list with online status
  - Coordinating bulk purchases
  - Discussing delivery, splitting costs, etc.
  - Linked to purchasing groups

**Example Use Case**: 
> Members of "Eco Warriors - Solar Panel Group" discuss delivery logistics, confirm quantities, and share installation tips.

### 2. **Vendor-Member Chat** 🏪
- **Purpose**: Individual members contact vendors about products
- **Features**:
  - 1-to-1 private conversations
  - Vendor online/offline status
  - Price negotiation
  - Product inquiries
  - Not visible to other group members

**Example Use Case**:
> A member asks GreenTech Solutions about bulk discounts for 50+ solar panels and discusses shipping options.

---

## Key Features Implemented

### ✅ **Conversation List**
- **Three tabs**: All, Groups, Vendors
- **Search functionality** across all conversations
- **Unread message badges** (red badges showing count)
- **Last message preview** with timestamp
- **Online status indicators** (green dot for vendors)
- **Typing indicators** in conversation list ("Sarah is typing...")

### ✅ **Chat Window**
- **Message bubbles** (blue for own messages, white for others)
- **Sender avatars** and names (group chats)
- **Timestamp display** (smart formatting: "5m ago", "2h ago", etc.)
- **Read receipts** (single ✓ = sent, double ✓✓ = read)
- **Online status** in header
- **Member count** for group chats (e.g., "5 members • 3 online")
- **Typing animation** (animated dots when someone is typing)

### ✅ **Real-Time Simulation**
- **Auto-responses**: When you send a message, the system simulates a reply after 2-3 seconds
- **Typing indicators**: Animates before auto-response appears
- **Context-aware responses**: Different responses based on keywords (price, delivery, etc.)

### ✅ **Mock Data**
- **3 Group Conversations** with realistic message history
- **3 Vendor Conversations** with realistic exchanges
- **Multiple participants** with avatars and online status
- **15+ messages per conversation** for testing scroll behavior

---

## Navigation

### Access Points
1. **Bottom Navigation**: Tap "Chat" icon
2. **Home Screen**: "Messages" card showing unread count
3. **Direct Link**: Navigate to `chat-dashboard` screen

---

## Testing Scenarios

### Test Group Chat
1. Open "Chat" from bottom nav
2. Tap "Groups" tab
3. Select "Eco Warriors - Solar Panel Group"
4. Observe:
   - Group member banner at top
   - Multiple senders with avatars
   - Group conversation flow
5. Type a message and send
6. Watch for auto-response from a group member

### Test Vendor Chat
1. Open "Chat" from bottom nav
2. Tap "Vendors" tab
3. Select "GreenTech Solutions"
4. Observe:
   - Vendor online status
   - 1-to-1 conversation
   - Phone/video call buttons
5. Type a question about pricing
6. Watch for vendor auto-response

### Test Features
- **Search**: Type "Solar" in search bar
- **Unread badges**: Notice red badges on conversations
- **Typing indicator**: Watch for "is typing..." when auto-response is coming
- **Read receipts**: Send message and see checkmarks
- **Online status**: Green dot on active vendors

---

## Mock Data Structure

### Files Created
- `/lib/chatMockData.ts` - All mock data, types, and helper functions
- `/components/chat/ChatDashboard.tsx` - Main chat screen with conversation list
- `/components/chat/ChatWindow.tsx` - Individual chat interface with messages

### Data Types
```typescript
type ConversationType = 'group' | 'vendor'

interface Conversation {
  id: string
  type: ConversationType
  title: string
  participants: ConversationParticipant[]
  unreadCount: number
  isOnline?: boolean // For vendors
  typingUsers?: string[] // IDs of users currently typing
  groupId?: string // Link to purchasing group
  vendorId?: string // Link to vendor
}

interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  content: string
  timestamp: string
  read: boolean
  isOwn?: boolean
}
```

---

## Next Steps: Backend Integration

Once you're satisfied with the UX, we'll implement the backend:

### Backend Implementation Tasks
1. **Database Schema**
   - Conversations table (with type: 'group' | 'vendor')
   - Messages table
   - ConversationParticipants table (for group chats)
   - Auto-create conversations when groups are created
   - Auto-add participants when users join groups

2. **REST API Endpoints**
   - `GET /conversations` - List all user's conversations
   - `GET /conversations/:id/messages` - Get message history
   - `POST /conversations/:id/messages` - Send a message
   - `GET /groups/:groupId/conversation` - Get group's conversation
   - `PUT /conversations/:id/read` - Mark messages as read

3. **WebSocket Events**
   - `join_conversation` - Subscribe to conversation updates
   - `send_message` - Broadcast message to participants
   - `typing_start` / `typing_stop` - Typing indicators
   - `user_online` / `user_offline` - Online status

4. **Automatic Workflows**
   - Create group conversation when group is created
   - Add user to conversation when they join a group
   - Remove user from conversation when they leave group
   - Notify participants of new messages

---

## UI/UX Features

### Conversation List
- **Visual Distinction**: Group icon vs. Store icon
- **Unread Emphasis**: Bold text + count badge
- **Smart Timestamps**: "Just now", "5m ago", "2h ago", dates
- **Typing Preview**: Live indicator in list

### Chat Window
- **Clean Message Bubbles**: Rounded, colored by sender
- **Grouped Messages**: Minimize repetitive sender names
- **Smooth Scrolling**: Auto-scroll to new messages
- **Input Focus**: Auto-focus on mount

### Responsive Design
- **Mobile-first**: Optimized for mobile screens
- **Bottom navigation**: Accessible chat icon
- **Full-screen chat**: Immersive experience

---

## Color Scheme

Following app design:
- **Primary Blue** (#0047AB): Headers, own messages, primary actions
- **Soft Green** (#6EE7B7): Online status, typing indicators
- **Coral** (#FB7185): Unread badges
- **Neutral Gray** (#F4F4F5): Background

---

## Questions for Testing

As you test, consider:
1. Is it clear which conversations are groups vs. vendors?
2. Are unread counts visible and accurate?
3. Is the message flow natural and easy to follow?
4. Do auto-responses feel realistic?
5. Is navigation intuitive?
6. Would you add any features before backend implementation?

---

**Ready to test!** Open the app, navigate to Chat, and explore both group and vendor conversations. 🚀
