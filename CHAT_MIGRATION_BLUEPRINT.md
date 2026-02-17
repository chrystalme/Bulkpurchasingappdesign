# Chat System → Redux Migration Blueprint

**Priority**: 🔴 CRITICAL  
**Estimated Effort**: 3-5 days  
**Risk Level**: MEDIUM-HIGH  
**Impact**: Fixes major architectural violation

---

## Problem Statement

The chat system is **completely outside Redux**, using:
- Custom `useChat` hook with `useState` (306 lines)
- Custom `useConversation` hook with `useState` 
- Independent Socket.IO event handlers
- Separate API client (`chatApi.ts`)

This causes:
- ❌ No Redux DevTools access
- ❌ No time-travel debugging
- ❌ State desync with groups
- ❌ No optimistic update rollback
- ❌ Prop drilling required
- ❌ Hard to test

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        React Components                      │
│  ChatDashboardReal, ChatWindowReal, GroupDetailNew          │
└─────────────────┬───────────────────────────────────────────┘
                  │ useAppDispatch / useAppSelector
                  ↓
┌─────────────────────────────────────────────────────────────┐
│                         Redux Store                          │
│                                                              │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐         │
│  │ Chat Slice │  │Groups Slice │  │ Auth Slice   │         │
│  │            │  │             │  │              │         │
│  │conversations│  │ groups[]   │  │ user         │         │
│  │messages{}  │  │currentGroup│  │ token        │         │
│  │typingUsers{}│  │            │  │              │         │
│  └────────────┘  └─────────────┘  └──────────────┘         │
│                                                              │
└──────┬────────────────────────────────────────┬────────────┘
       │                                        │
       │ Async Thunks                           │ Socket Events
       ↓                                        ↓
┌──────────────┐                    ┌────────────────────────┐
│  Chat API    │                    │  Socket Middleware     │
│  (REST)      │                    │                        │
│              │                    │ Listens to socket      │
│ GET messages │                    │ Dispatches actions     │
│ POST message │                    │                        │
└──────────────┘                    └───────────┬────────────┘
                                                │
                                                ↓
                                    ┌────────────────────────┐
                                    │  Socket.IO Client      │
                                    │                        │
                                    │ new-message            │
                                    │ user-typing            │
                                    │ user-online-status     │
                                    └────────────────────────┘
```

---

## Step-by-Step Migration Plan

### Step 1: Create Chat Slice (Day 1 - Morning)

**File**: `src/store/slices/chatSlice.ts`

```typescript
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { ChatMessage, Conversation, ConversationParticipant, TypingUser } from '../../lib/types/chat.types';
import { apiClient } from '../../lib/api';

// ============================================
// STATE INTERFACE
// ============================================

interface ChatState {
  // Conversations List
  conversations: Conversation[];
  conversationsLoading: boolean;
  conversationsError: string | null;
  
  // Messages (keyed by conversationId)
  messagesByConversation: Record<string, ChatMessage[]>;
  messagesLoading: Record<string, boolean>;
  messagesError: Record<string, string | null>;
  
  // Participants (keyed by conversationId)
  participantsByConversation: Record<string, ConversationParticipant[]>;
  
  // Real-time State
  typingUsersByConversation: Record<string, TypingUser[]>;
  onlineUsers: Record<string, boolean>; // userId → isOnline
  
  // UI State
  selectedConversationId: string | null;
  
  // Optimistic Updates
  pendingMessages: Record<string, ChatMessage>; // tempId → message
}

const initialState: ChatState = {
  conversations: [],
  conversationsLoading: false,
  conversationsError: null,
  
  messagesByConversation: {},
  messagesLoading: {},
  messagesError: {},
  
  participantsByConversation: {},
  
  typingUsersByConversation: {},
  onlineUsers: {},
  
  selectedConversationId: null,
  
  pendingMessages: {},
};

// ============================================
// ASYNC THUNKS
// ============================================

export const fetchConversations = createAsyncThunk(
  'chat/fetchConversations',
  async (filters?: { type?: 'group' | 'group-vendor'; groupId?: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.chat.getConversations(filters);
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch conversations');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchMessages = createAsyncThunk(
  'chat/fetchMessages',
  async (conversationId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.chat.getMessages(conversationId);
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch messages');
      }
      return { conversationId, messages: response.data };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchParticipants = createAsyncThunk(
  'chat/fetchParticipants',
  async (conversationId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.chat.getParticipants(conversationId);
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch participants');
      }
      return { conversationId, participants: response.data };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Optimistic message sending
export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (
    { conversationId, content, tempId }: { conversationId: string; content: string; tempId: string },
    { rejectWithValue, getState }
  ) => {
    try {
      // Actual sending happens via socket middleware
      // This thunk is mainly for tracking the async operation
      return { conversationId, tempId };
    } catch (error) {
      return rejectWithValue({ tempId, error: (error as Error).message });
    }
  }
);

// ============================================
// SLICE
// ============================================

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // ============================================
    // SOCKET EVENT HANDLERS (called by middleware)
    // ============================================
    
    messageReceived: (state, action: PayloadAction<ChatMessage>) => {
      const message = action.payload;
      const { conversationId } = message;
      
      // Initialize array if needed
      if (!state.messagesByConversation[conversationId]) {
        state.messagesByConversation[conversationId] = [];
      }
      
      // Check if this is a pending optimistic message being confirmed
      if (message.tempId && state.pendingMessages[message.tempId]) {
        // Remove from pending
        delete state.pendingMessages[message.tempId];
        
        // Replace temp message with real one
        const messages = state.messagesByConversation[conversationId];
        const tempIndex = messages.findIndex(m => m.id === message.tempId);
        if (tempIndex !== -1) {
          messages[tempIndex] = message;
        } else {
          messages.push(message);
        }
      } else {
        // New message from another user (or our own echoed back)
        const messages = state.messagesByConversation[conversationId];
        
        // Dedup: don't add if already exists
        if (!messages.some(m => m.id === message.id)) {
          messages.push(message);
        }
      }
      
      // Update conversation's lastMessage
      const conversation = state.conversations.find(c => c.id === conversationId);
      if (conversation) {
        conversation.lastMessage = message;
        conversation.updatedAt = message.timestamp;
        
        // Increment unread count if not own message
        if (!message.isOwn) {
          conversation.unreadCount = (conversation.unreadCount || 0) + 1;
        }
      }
    },
    
    typingStatusChanged: (state, action: PayloadAction<{
      userId: string;
      userName: string;
      conversationId: string;
      isTyping: boolean;
    }>) => {
      const { conversationId, userId, userName, isTyping } = action.payload;
      
      if (!state.typingUsersByConversation[conversationId]) {
        state.typingUsersByConversation[conversationId] = [];
      }
      
      const typingUsers = state.typingUsersByConversation[conversationId];
      
      if (isTyping) {
        // Add user if not already typing
        if (!typingUsers.some(u => u.userId === userId)) {
          typingUsers.push({ userId, userName });
        }
      } else {
        // Remove user
        const index = typingUsers.findIndex(u => u.userId === userId);
        if (index !== -1) {
          typingUsers.splice(index, 1);
        }
      }
      
      // Also update conversation
      const conversation = state.conversations.find(c => c.id === conversationId);
      if (conversation) {
        conversation.typingUsers = typingUsers;
      }
    },
    
    userOnlineStatusChanged: (state, action: PayloadAction<{
      userId: string;
      isOnline: boolean;
    }>) => {
      const { userId, isOnline } = action.payload;
      state.onlineUsers[userId] = isOnline;
      
      // Update conversations that have this user as vendor
      state.conversations.forEach(conv => {
        if (conv.vendorId === userId) {
          conv.isOnline = isOnline;
        }
      });
      
      // Update participants
      Object.values(state.participantsByConversation).forEach(participants => {
        const participant = participants.find(p => p.userId === userId);
        if (participant) {
          participant.isOnline = isOnline;
        }
      });
    },
    
    messageDeleted: (state, action: PayloadAction<{
      messageId: string;
      conversationId: string;
    }>) => {
      const { messageId, conversationId } = action.payload;
      const messages = state.messagesByConversation[conversationId];
      if (messages) {
        const index = messages.findIndex(m => m.id === messageId);
        if (index !== -1) {
          messages.splice(index, 1);
        }
      }
    },
    
    conversationRead: (state, action: PayloadAction<string>) => {
      const conversationId = action.payload;
      const conversation = state.conversations.find(c => c.id === conversationId);
      if (conversation) {
        conversation.unreadCount = 0;
      }
    },
    
    // ============================================
    // UI ACTIONS
    // ============================================
    
    selectConversation: (state, action: PayloadAction<string | null>) => {
      state.selectedConversationId = action.payload;
    },
    
    addOptimisticMessage: (state, action: PayloadAction<{
      conversationId: string;
      message: ChatMessage;
    }>) => {
      const { conversationId, message } = action.payload;
      
      // Add to pending
      state.pendingMessages[message.id] = message;
      
      // Add to messages list
      if (!state.messagesByConversation[conversationId]) {
        state.messagesByConversation[conversationId] = [];
      }
      state.messagesByConversation[conversationId].push(message);
    },
    
    removeOptimisticMessage: (state, action: PayloadAction<{
      conversationId: string;
      tempId: string;
    }>) => {
      const { conversationId, tempId } = action.payload;
      
      // Remove from pending
      delete state.pendingMessages[tempId];
      
      // Remove from messages
      const messages = state.messagesByConversation[conversationId];
      if (messages) {
        const index = messages.findIndex(m => m.id === tempId);
        if (index !== -1) {
          messages.splice(index, 1);
        }
      }
    },
    
    clearChat: (state) => {
      return initialState;
    },
  },
  
  extraReducers: (builder) => {
    // Fetch Conversations
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.conversationsLoading = true;
        state.conversationsError = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.conversationsLoading = false;
        state.conversations = action.payload;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.conversationsLoading = false;
        state.conversationsError = action.payload as string;
      });
    
    // Fetch Messages
    builder
      .addCase(fetchMessages.pending, (state, action) => {
        const conversationId = action.meta.arg;
        state.messagesLoading[conversationId] = true;
        state.messagesError[conversationId] = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        const { conversationId, messages } = action.payload;
        state.messagesLoading[conversationId] = false;
        state.messagesByConversation[conversationId] = messages;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        const conversationId = action.meta.arg;
        state.messagesLoading[conversationId] = false;
        state.messagesError[conversationId] = action.payload as string;
      });
    
    // Fetch Participants
    builder
      .addCase(fetchParticipants.fulfilled, (state, action) => {
        const { conversationId, participants } = action.payload;
        state.participantsByConversation[conversationId] = participants;
      });
  },
});

export const {
  messageReceived,
  typingStatusChanged,
  userOnlineStatusChanged,
  messageDeleted,
  conversationRead,
  selectConversation,
  addOptimisticMessage,
  removeOptimisticMessage,
  clearChat,
} = chatSlice.actions;

export default chatSlice.reducer;
```

**Estimated**: 4-6 hours

---

### Step 2: Create Socket Middleware (Day 1 - Afternoon)

**File**: `src/store/middleware/socketMiddleware.ts`

```typescript
import { Middleware } from '@reduxjs/toolkit';
import { chatSocket } from '../../lib/socket/chatSocket';
import {
  messageReceived,
  typingStatusChanged,
  userOnlineStatusChanged,
  messageDeleted,
  addOptimisticMessage,
  removeOptimisticMessage,
  sendMessage,
} from '../slices/chatSlice';
import type { RootState } from '../store';

let initialized = false;

export const socketMiddleware: Middleware<{}, RootState> = (store) => (next) => (action) => {
  // ============================================
  // HANDLE OUTGOING ACTIONS → SOCKET EVENTS
  // ============================================
  
  if (sendMessage.pending.match(action)) {
    const { conversationId, content, tempId } = action.meta.arg;
    
    // Get current user from auth state
    const state = store.getState();
    const user = state.auth?.user; // Assumes auth slice exists
    
    if (!user) {
      console.error('Cannot send message: No user logged in');
      return next(action);
    }
    
    // Create optimistic message
    const optimisticMessage = {
      id: tempId,
      conversationId,
      senderId: user.id,
      senderName: user.name,
      senderAvatar: user.avatar,
      content,
      timestamp: new Date().toISOString(),
      read: false,
      isOwn: true,
      tempId, // Mark as temporary
    };
    
    // Add to UI immediately
    store.dispatch(addOptimisticMessage({ conversationId, message: optimisticMessage }));
    
    // Send via socket
    chatSocket.sendMessage(conversationId, content);
  }
  
  // Pass action to next middleware
  const result = next(action);
  
  // ============================================
  // SETUP SOCKET LISTENERS (once)
  // ============================================
  
  if (!initialized) {
    // New message received
    chatSocket.on('new-message', (message) => {
      // Get current user to determine isOwn
      const state = store.getState();
      const userId = state.auth?.user?.id;
      
      store.dispatch(messageReceived({
        ...message,
        isOwn: message.senderId === userId,
      }));
    });
    
    // Typing indicator
    chatSocket.on('user-typing', (data) => {
      store.dispatch(typingStatusChanged(data));
    });
    
    // Online status
    chatSocket.on('user-online-status', (data) => {
      store.dispatch(userOnlineStatusChanged(data));
    });
    
    // Message deleted
    chatSocket.on('message-deleted', (data) => {
      store.dispatch(messageDeleted(data));
    });
    
    // Messages marked as read
    chatSocket.on('messages-read', (data) => {
      // Could dispatch action to update read status
      console.log('Messages read:', data);
    });
    
    initialized = true;
  }
  
  return result;
};
```

**Estimated**: 2-3 hours

---

### Step 3: Update API Client (Day 1 - Late Afternoon)

**File**: `src/lib/api.ts`

Add chat methods to `apiClient`:

```typescript
// Add to apiClient object
export const apiClient = {
  // ... existing methods ...
  
  chat: {
    getConversations: async (filters?: { type?: string; groupId?: string }) => {
      const params = new URLSearchParams();
      if (filters?.type) params.append('type', filters.type);
      if (filters?.groupId) params.append('groupId', filters.groupId);
      
      const url = `/chat/conversations${params.toString() ? `?${params}` : ''}`;
      const response = await makeRequest<Conversation[]>(url);
      return response;
    },
    
    getMessages: async (conversationId: string) => {
      return makeRequest<ChatMessage[]>(`/chat/conversations/${conversationId}/messages`);
    },
    
    getParticipants: async (conversationId: string) => {
      return makeRequest<ConversationParticipant[]>(`/chat/conversations/${conversationId}/participants`);
    },
    
    markAsRead: async (conversationId: string) => {
      return makeRequest<void>(`/chat/conversations/${conversationId}/read`, {
        method: 'PUT',
      });
    },
    
    createGroupVendorConversation: async (data: {
      groupId: string;
      vendorId: string;
      productId?: string;
    }) => {
      return makeRequest<{ id: string }>('/chat/conversations/group-vendor', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  },
};
```

**Estimated**: 1 hour

---

### Step 4: Create Chat Selectors (Day 2 - Morning)

**File**: `src/store/selectors/chatSelectors.ts`

```typescript
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';

// Basic selectors
export const selectConversations = (state: RootState) => state.chat.conversations;
export const selectConversationsLoading = (state: RootState) => state.chat.conversationsLoading;
export const selectConversationsError = (state: RootState) => state.chat.conversationsError;

export const selectSelectedConversationId = (state: RootState) => state.chat.selectedConversationId;

// Messages by conversation
export const selectMessagesByConversation = (state: RootState, conversationId: string) =>
  state.chat.messagesByConversation[conversationId] || [];

export const selectMessagesLoading = (state: RootState, conversationId: string) =>
  state.chat.messagesLoading[conversationId] || false;

export const selectMessagesError = (state: RootState, conversationId: string) =>
  state.chat.messagesError[conversationId] || null;

// Participants
export const selectParticipants = (state: RootState, conversationId: string) =>
  state.chat.participantsByConversation[conversationId] || [];

// Typing users
export const selectTypingUsers = (state: RootState, conversationId: string) =>
  state.chat.typingUsersByConversation[conversationId] || [];

// Selected conversation (memoized)
export const selectSelectedConversation = createSelector(
  [selectConversations, selectSelectedConversationId],
  (conversations, selectedId) => {
    if (!selectedId) return null;
    return conversations.find(c => c.id === selectedId) || null;
  }
);

// Conversations by group (memoized)
export const selectConversationsByGroup = createSelector(
  [selectConversations, (_state: RootState, groupId: string) => groupId],
  (conversations, groupId) => conversations.filter(c => c.groupId === groupId)
);

// Unread count
export const selectTotalUnreadCount = createSelector(
  [selectConversations],
  (conversations) => conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
);

// Conversations by type
export const selectGroupConversations = createSelector(
  [selectConversations],
  (conversations) => conversations.filter(c => c.type === 'group')
);

export const selectVendorConversations = createSelector(
  [selectConversations],
  (conversations) => conversations.filter(c => c.type === 'group-vendor')
);
```

**Estimated**: 1 hour

---

### Step 5: Update Store Configuration (Day 2 - Morning)

**File**: `src/store/store.ts`

```typescript
import { configureStore } from '@reduxjs/toolkit';
import groupsReducer from './slices/groupsSlice';
import productsReducer from './slices/productsSlice';
import vendorsReducer from './slices/vendorsSlice';
import ordersReducer from './slices/ordersSlice';
import escrowReducer from './slices/escrowSlice';
import usersReducer from './slices/usersSlice';
import chatReducer from './slices/chatSlice'; // NEW
import { socketMiddleware } from './middleware/socketMiddleware'; // NEW

export const store = configureStore({
  reducer: {
    groups: groupsReducer,
    products: productsReducer,
    vendors: vendorsReducer,
    orders: ordersReducer,
    escrow: escrowReducer,
    users: usersReducer,
    chat: chatReducer, // NEW
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(socketMiddleware), // NEW
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

---

### Step 6: Refactor ChatDashboardReal (Day 2 - Afternoon)

**File**: `src/components/chat/ChatDashboardReal.tsx`

```typescript
// BEFORE
import { useChat } from '../../hooks/useChat';
const { conversations, loading, error } = useChat();

// AFTER
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchConversations,
  selectConversations,
  selectConversationsLoading,
  selectConversationsError,
  selectConversation,
} from '../../store';

const dispatch = useAppDispatch();
const conversations = useAppSelector(selectConversations);
const loading = useAppSelector(selectConversationsLoading);
const error = useAppSelector(selectConversationsError);

useEffect(() => {
  dispatch(fetchConversations());
}, [dispatch]);

// When selecting conversation
const handleSelectConversation = (conversationId: string) => {
  dispatch(selectConversation(conversationId));
  setSelectedConversationId(conversationId); // Local UI state
};
```

**Full refactor**: Replace all `useChat` calls with Redux

**Estimated**: 2 hours

---

### Step 7: Refactor ChatWindowReal (Day 3)

**File**: `src/components/chat/ChatWindowReal.tsx`

```typescript
// BEFORE
import { useConversation } from '../../hooks/useChat';
const {
  messages,
  participants,
  loading,
  typingUsers,
  sendMessage,
  sendTypingIndicator,
  markAsRead,
} = useConversation(conversation.id);

// AFTER
import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchMessages,
  fetchParticipants,
  sendMessage as sendMessageAction,
  selectMessagesByConversation,
  selectMessagesLoading,
  selectParticipants,
  selectTypingUsers,
} from '../../store';
import { chatSocket } from '../../lib/socket/chatSocket';

const dispatch = useAppDispatch();
const messages = useAppSelector(state => 
  selectMessagesByConversation(state, conversation.id)
);
const loading = useAppSelector(state => 
  selectMessagesLoading(state, conversation.id)
);
const participants = useAppSelector(state =>
  selectParticipants(state, conversation.id)
);
const typingUsers = useAppSelector(state =>
  selectTypingUsers(state, conversation.id)
);

// Load messages on mount
useEffect(() => {
  dispatch(fetchMessages(conversation.id));
  dispatch(fetchParticipants(conversation.id));
}, [conversation.id, dispatch]);

// Send message
const handleSendMessage = useCallback((content: string) => {
  const tempId = `temp-${Date.now()}`;
  dispatch(sendMessageAction({
    conversationId: conversation.id,
    content,
    tempId,
  }));
}, [conversation.id, dispatch]);

// Typing indicator
const handleTypingChange = useCallback((isTyping: boolean) => {
  chatSocket.sendTypingIndicator(conversation.id, isTyping);
}, [conversation.id]);

// Mark as read
useEffect(() => {
  chatSocket.markAsRead(conversation.id);
}, [conversation.id]);
```

**Full refactor**: Replace all `useConversation` calls with Redux

**Estimated**: 3 hours

---

### Step 8: Refactor GroupDetailNew (Day 3)

**File**: `src/components/groups/GroupDetailNew.tsx`

```typescript
// BEFORE (line 38, 62)
import { useChat } from '../../hooks/useChat';
const { conversations, loading: chatsLoading } = useChat();

// AFTER
import { useAppSelector } from '../../store/hooks';
import { selectConversationsByGroup } from '../../store/selectors/chatSelectors';

const conversations = useAppSelector(state =>
  selectConversationsByGroup(state, groupId || '')
);
```

**Estimated**: 30 minutes

---

### Step 9: Testing (Day 4)

**Test Checklist**:

1. **Redux DevTools**:
   - [ ] Open DevTools, verify chat state structure
   - [ ] Send message, verify `chat/sendMessage/pending` action
   - [ ] Receive message, verify `chat/messageReceived` action
   - [ ] Check typing indicator, verify `chat/typingStatusChanged`
   - [ ] Test time-travel debugging (jump back in state)

2. **Functionality**:
   - [ ] Load conversations list
   - [ ] Open conversation, load messages
   - [ ] Send message (optimistic update)
   - [ ] Receive message from other user
   - [ ] Typing indicator shows correctly
   - [ ] Online status updates
   - [ ] Mark as read works
   - [ ] Unread count updates

3. **Edge Cases**:
   - [ ] Network failure (message should rollback)
   - [ ] Socket disconnect/reconnect
   - [ ] Multiple conversations open
   - [ ] Fast typing (debounce check)
   - [ ] Logout (chat state cleared)

4. **Performance**:
   - [ ] 100+ messages load quickly
   - [ ] No unnecessary re-renders
   - [ ] Selectors memoized correctly

**Estimated**: 1 day

---

### Step 10: Cleanup & Documentation (Day 5)

1. **Delete Old Files**:
   - [ ] `src/hooks/useChat.ts`
   - [ ] `src/lib/api/chatApi.ts` (if fully migrated to apiClient)

2. **Update Imports**:
   - [ ] Search for `import.*useChat` (should be 0 results)
   - [ ] Search for `import.*chatApi` (should be 0 results)

3. **Documentation**:
   - [ ] Update README with new chat architecture
   - [ ] Add JSDoc to chat slice
   - [ ] Document socket middleware

4. **Code Review**:
   - [ ] Review all changes
   - [ ] Run linter
   - [ ] Run type checker
   - [ ] Run tests

**Estimated**: Half day

---

## Migration Checklist

### Pre-Migration
- [ ] Read this blueprint thoroughly
- [ ] Backup current code (git branch)
- [ ] Review current chat functionality
- [ ] Document edge cases to test

### Day 1: Foundation
- [ ] Create `chatSlice.ts`
- [ ] Create `socketMiddleware.ts`
- [ ] Update `apiClient` with chat methods
- [ ] Test Redux state updates manually

### Day 2: Selectors & First Component
- [ ] Create `chatSelectors.ts`
- [ ] Update `store.ts` configuration
- [ ] Refactor `ChatDashboardReal.tsx`
- [ ] Test conversation list

### Day 3: Message Components
- [ ] Refactor `ChatWindowReal.tsx`
- [ ] Refactor `GroupDetailNew.tsx`
- [ ] Test message sending/receiving
- [ ] Test typing indicators

### Day 4: Testing
- [ ] Redux DevTools verification
- [ ] Functional testing
- [ ] Edge case testing
- [ ] Performance testing

### Day 5: Cleanup
- [ ] Delete old files
- [ ] Update documentation
- [ ] Code review
- [ ] Final testing

---

## Rollback Plan

If issues arise:

1. **Keep Feature Flag**:
   ```typescript
   const USE_REDUX_CHAT = process.env.VITE_REDUX_CHAT === 'true';
   ```

2. **Dual Implementation**:
   - Keep old `useChat` hook
   - Use flag to switch between implementations
   - Allows instant rollback

3. **Git Safety**:
   - Work in branch: `feature/chat-redux-migration`
   - Commit after each step
   - Can revert individual commits

---

## Success Metrics

After migration, verify:

✅ **Redux DevTools shows**:
- chat/fetchConversations actions
- chat/messageReceived actions
- Complete state tree

✅ **All features work**:
- Send/receive messages
- Typing indicators
- Online status
- Unread counts
- Mark as read

✅ **Code quality improved**:
- No `useChat` imports
- Chat state testable
- Selectors memoized
- Socket events centralized

✅ **No regressions**:
- All existing tests pass
- Manual QA passes
- Performance same or better

---

## Questions & Answers

**Q: Why not use Redux Toolkit Query?**  
A: RTK Query is great for REST APIs, but chat uses Socket.IO for real-time updates. Custom middleware gives more control.

**Q: What about message pagination?**  
A: Add `fetchMoreMessages` thunk with `before` parameter. Update slice to handle appending/prepending.

**Q: How to handle message drafts?**  
A: Add `draftsByConversation` to state. Save on input change.

**Q: How to implement search?**  
A: Add `searchConversations` thunk. Add `searchResults` to state.

**Q: What about file uploads?**  
A: Add `uploadFile` thunk. Track upload progress in state.

---

## Next Steps After Chat Migration

1. **Auth Consolidation** (Phase 1 from main report)
2. **Cart Slice** (Phase 3 from main report)  
3. **Navigation** (Phase 3 from main report)
4. **Redux Persist** (Phase 4 from main report)

---

**Blueprint Version**: 1.0  
**Last Updated**: 2026
**Status**: Ready for implementation
