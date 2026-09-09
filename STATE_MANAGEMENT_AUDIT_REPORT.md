# State Management Audit Report
## Single Source of Truth Violations Analysis

**Project**: Bulk Purchasing App (React + Redux Toolkit)  
**Date**: 2024  
**Total Lines of Code**: ~26,000 lines  
**Audit Focus**: State management architecture and single source of truth violations

---

## Executive Summary

This application suffers from **severe fragmentation** of state management across multiple systems:
- ✅ **Redux Store** (6 slices - properly implemented)
- ❌ **React Context** (Auth state - duplicates user data)
- ❌ **Custom Hooks with Local State** (Chat system - major violation)
- ❌ **localStorage** (Direct reads in 10+ locations - bypassing state management)
- ❌ **Component Local State** (Cart, navigation - should be in Redux)

**Critical Finding**: The **chat system** is completely outside Redux, managed by a custom hook (`useChat`) with local `useState`, creating a parallel state management system that conflicts with Redux principles.

**Impact**: 
- 🔴 **HIGH**: State synchronization issues
- 🔴 **HIGH**: Maintenance complexity
- 🟡 **MEDIUM**: Race conditions with Socket.IO updates
- 🟡 **MEDIUM**: Prop drilling in chat components
- 🟢 **LOW**: Performance (minimal impact currently)

---

## 1. Current State Management Architecture

### 1.1 Redux Store (PROPERLY IMPLEMENTED ✅)

**Location**: `src/store/store.ts`

```typescript
{
  groups: GroupsState,      // ✅ Groups, members, join requests
  products: ProductsState,  // ✅ Products, categories, filters
  vendors: VendorsState,    // ✅ Vendors, dashboard, orders, customers
  orders: OrdersState,      // ✅ Orders, current order
  escrow: EscrowState,      // ✅ Escrow transactions
  users: UsersState,        // ✅ User list, stats (admin only)
}
```

**What IS in Redux** (Good):
- ✅ Groups state (`groupsSlice.ts`) - comprehensive with 12 thunks
- ✅ Products state (`productsSlice.ts`) - 3 thunks
- ✅ Vendors state (`vendorsSlice.ts`) - 5 thunks
- ✅ Orders state (`ordersSlice.ts`) - 4 thunks
- ✅ Escrow state (`escrowSlice.ts`) - 4 thunks
- ✅ Users state (`usersSlice.ts`) - 2 thunks (for admin user management)

**Assessment**: Redux slices are well-structured, follow Redux Toolkit best practices, have proper loading/error states, and use typed selectors.

### 1.2 React Context (VIOLATION ❌)

**Location**: `src/contexts/AuthContext.tsx`

**What's Stored**:
```typescript
{
  user: User | null,           // ❌ DUPLICATE: User info
  isAuthenticated: boolean,    // ❌ DERIVED: Could be computed from user
  isLoading: boolean,          // ❌ Should be in Redux
  login: Function,             // ✅ OK: Auth actions
  signup: Function,            // ✅ OK: Auth actions
  logout: Function,            // ✅ OK: Auth actions
  updateCurrentUser: Function  // ❌ VIOLATION: Optimistic updates outside Redux
}
```

**Problems**:
1. **Line 22-23**: `user` state duplicates what could be in Redux
2. **Line 86, 109**: Stores `userId` in localStorage separately from user object
3. **Line 131**: `updateCurrentUser` allows local optimistic updates bypassing Redux
4. **Lines 52-74**: Bootstrap logic could be a Redux thunk

**Impact**: 
- Auth state is in Context, but user lists are in Redux (`usersSlice`)
- Creates two sources of truth for user data
- Components must choose between `useAuth()` or `useAppSelector(selectUsers)`

### 1.3 Custom Hooks with Local State (CRITICAL VIOLATION 🔴)

**Location**: `src/hooks/useChat.ts`

**The Problem**: Entire chat system uses local `useState` instead of Redux.

```typescript
// Line 19-21: Local state in useChat hook
const [conversations, setConversations] = useState<Conversation[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

// Line 132-137: Local state in useConversation hook
const [messages, setMessages] = useState<ChatMessage[]>([]);
const [participants, setParticipants] = useState<ConversationParticipant[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [typingUsers, setTypingUsers] = useState<string[]>([]);
```

**Scope of the Issue**:
- **58-72**: Real-time socket updates modify local state directly
- **74-98**: Typing indicators managed in local state
- **101-109**: Online status updates managed in local state
- **224-245**: Message handling with optimistic updates in local state
- **173-184**: Optimistic message sending (line 173-184) creates temporary messages

**Files Affected**:
- `src/hooks/useChat.ts` (306 lines) - Hook implementation
- `src/components/chat/ChatWindowReal.tsx` - Uses `useConversation` hook
- `src/components/chat/ChatDashboardReal.tsx` - Uses `useChat` hook
- `src/components/groups/GroupDetailNew.tsx` (lines 38, 62) - Imports chat hook AND Redux
- `src/lib/api/chatApi.ts` - Independent API layer (261 lines)
- `src/lib/socket/chatSocket.ts` - Socket.IO client with own event system (298 lines)

**Why This is a Major Violation**:
1. Chat data is not accessible to Redux DevTools
2. Time-travel debugging doesn't work for chat
3. Cannot persist/rehydrate chat state
4. Cannot share chat state across components without prop drilling
5. Real-time updates bypass Redux middleware
6. Optimistic updates have no rollback mechanism
7. No single source of truth for conversation state

**Real-World Bug Example**:
```typescript
// GroupDetailNew.tsx line 62
const { conversations, loading: chatsLoading } = useChat();

// This fetches conversations independently from Redux groups state
// If a group is deleted in Redux, conversations don't update automatically
// Creates desync between group membership and chat availability
```

### 1.4 localStorage Direct Access (VIOLATION ❌)

**47 instances** of direct `localStorage` access across the codebase:

**Critical Violations**:

1. **`src/contexts/AuthContext.tsx`**:
   - Line 52: `localStorage.getItem('auth_token')` - Bootstrap
   - Line 86: `localStorage.setItem('userId', response.user.id)` - User ID stored separately
   - Line 109: `localStorage.setItem('userId', response.user.id)` - Duplicate storage
   - Line 122-123: Direct removal without Redux update

2. **`src/lib/socket/chatSocket.ts`**:
   - Line 92: `localStorage.getItem('userId')` - **Used to determine if message is own**
   - Line 192: `localStorage.getItem('auth_token')` - Reconnection logic
   - Line 281: `localStorage.getItem('auth_token')` - Auto-connect on page load

3. **`src/lib/api/chatApi.ts`**:
   - Line 11: `localStorage.getItem('auth_token')` - Auth header function

4. **`src/lib/api.ts`**:
   - Line 80: `localStorage.getItem('auth_token')` - Every API call
   - Line 85: `localStorage.getItem('refresh_token')` - Token refresh

5. **`src/App.tsx`**:
   - Lines 141-142: `localStorage.getItem('lastScreen')`, `localStorage.getItem('lastGroupId')`
   - Lines 184-195: Screen/navigation state persistence
   - **Problem**: Navigation state is in component state + localStorage, not Redux

**Impact**:
- 10+ components read `userId` from localStorage instead of auth context/Redux
- Token management scattered across 3 different files
- No central place to update when user logs out
- Race conditions possible if localStorage and state get out of sync

### 1.5 Component Local State (SHOULD BE REDUX)

**Cart State** (`src/components/products/GroupCart.tsx`):
```typescript
// Lines 30-50: Cart stored in component state
const [cartItems, setCartItems] = useState<CartItemData[]>([
  {
    productId: '1',
    quantity: 12,
    allocations: [
      { memberId: '1', quantity: 4 },
      { memberId: '2', quantity: 5 },
      { memberId: '3', quantity: 3 },
    ],
  },
  // ...
]);
```

**Problems**:
- Cart data lost on navigation away from component
- No cart persistence
- Cannot show cart count in navigation
- Cannot prefill checkout screen

**Navigation State** (`src/App.tsx`):
```typescript
// Lines 83-84: Screen navigation in component state + localStorage
const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
```

**Problems**:
- Navigation state duplicated in state + localStorage
- No history/back button support
- Restoration logic complex (lines 138-157)
- Should use React Router or Redux navigation slice

---

## 2. Specific Violations of Single Source of Truth

### 2.1 User Data: THREE Sources of Truth 🔴

**Source 1**: AuthContext (`src/contexts/AuthContext.tsx`)
```typescript
const [user, setUser] = useState<User | null>(null); // Line 42
// Contains: id, name, email, role, avatar
```

**Source 2**: localStorage
```typescript
localStorage.setItem('userId', response.user.id); // Line 86, 109
// Contains: just user ID
```

**Source 3**: Redux users slice (`src/store/slices/usersSlice.ts`)
```typescript
users: User[]; // Line 21
// Contains: Array of all users (admin view)
```

**Conflict Example**:
```typescript
// Component A uses auth context
const { user } = useAuth(); // Get current user from context
console.log(user.name); // "John Doe"

// Component B uses localStorage
const userId = localStorage.getItem('userId'); // Get user ID from storage
// But no access to user name without another fetch

// Component C uses Redux (if admin)
const users = useAppSelector(selectUsers);
const currentUser = users.find(u => u.id === userId);
// Different source, potentially stale data
```

**Recommendation**: Move auth state to Redux with an `authSlice`.

### 2.2 Chat Data: COMPLETELY OUTSIDE REDUX 🔴🔴🔴

**What's NOT in Redux**:
- ❌ Conversations list (stored in `useChat` hook state)
- ❌ Messages (stored in `useConversation` hook state)
- ❌ Typing indicators (hook state)
- ❌ Online status (hook state)
- ❌ Unread counts (hook state)
- ❌ Participants (hook state)

**Current Flow**:
```
Component → useChat() → useState → API Call → Local State Update
         ↓
    useConversation() → useState → Socket.IO Event → Local State Update
```

**Should Be**:
```
Component → dispatch(fetchConversations) → Redux Thunk → API Call → Redux State
         ↓
    Redux Middleware → Socket.IO Event → dispatch(socketMessageReceived) → Redux State
```

**Files Needing Refactor**:
1. Create `src/store/slices/chatSlice.ts` (NEW)
2. Create `src/store/middleware/socketMiddleware.ts` (NEW) 
3. Refactor `src/hooks/useChat.ts` → Remove (delete file)
4. Update `src/components/chat/ChatWindowReal.tsx` → Use Redux
5. Update `src/components/chat/ChatDashboardReal.tsx` → Use Redux
6. Update `src/components/groups/GroupDetailNew.tsx` → Remove useChat import

### 2.3 Navigation State: Component State + localStorage 🟡

**Current**: 
- `App.tsx` line 83-84: Screen state in component
- `App.tsx` lines 141-195: Manual localStorage sync

**Should Be**:
- Use React Router OR
- Redux navigation slice with `selectedScreen` and `selectedGroupId`

### 2.4 Cart State: Lost on Unmount 🟡

**Current**: `GroupCart.tsx` lines 32-50 - Component state

**Should Be**:
- `cartSlice` in Redux
- Persist to localStorage via Redux middleware (redux-persist)
- Access from any component

---

## 3. Race Conditions and Sync Issues

### 3.1 Chat + Groups Desync

**File**: `src/components/groups/GroupDetailNew.tsx`

```typescript
// Line 52: Redux groups state
const { currentGroup } = useAppSelector(state => state.groups);

// Line 62: Local chat state
const { conversations } = useChat();

// PROBLEM: If group is deleted/left in Redux, conversations don't update
```

**Scenario**:
1. User is in Group A
2. Chat shows "Group Chat" conversation (from `useChat`)
3. User is removed from group (Redux updates `currentGroup`)
4. Chat conversation still shows (local state not updated)
5. User can send messages to a group they're no longer in

### 3.2 Socket Updates Bypass Redux

**File**: `src/hooks/useChat.ts` lines 57-72

```typescript
const handleNewMessage = (message: ChatMessage) => {
  setConversations(prev => 
    prev.map(conv => {
      if (conv.id === message.conversationId) {
        return {
          ...conv,
          lastMessage: message,
          unreadCount: message.isOwn ? conv.unreadCount : conv.unreadCount + 1,
          // ^^^ PROBLEM: Manual unread count calculation
        };
      }
      return conv;
    })
  );
};
```

**Issues**:
- Unread count manually incremented (no server verification)
- If socket reconnects, local state may diverge from server
- No way to validate against Redux groups state

### 3.3 Optimistic Updates Without Rollback

**File**: `src/hooks/useChat.ts` lines 173-184

```typescript
const sendMessage = useCallback((content: string) => {
  // Optimistic update
  const optimisticMessage: ChatMessage = {
    id: `temp-${Date.now()}`, // Temporary ID
    // ...
  };
  setMessages(prev => [...prev, optimisticMessage]);
  
  chatSocket.sendMessage(conversationId, content);
  // ^^^ PROBLEM: No error handling, no rollback if socket fails
}, [conversationId, user]);
```

**What Happens on Failure**:
1. Message appears in UI immediately
2. Socket fails to send (network issue)
3. Message stays in UI with `temp-` ID
4. Never gets real ID from server
5. User thinks message was sent, but it wasn't

**Proper Redux Flow**:
```typescript
dispatch(sendMessage({ conversationId, content }))
  .unwrap()
  .catch(error => {
    // Rollback optimistic update
    dispatch(removeOptimisticMessage(tempId));
    toast.error('Failed to send message');
  });
```

### 3.4 localStorage Read in Socket Handler

**File**: `src/lib/socket/chatSocket.ts` line 92

```typescript
this.socket.on('new-message', (message: ChatMessage) => {
  const currentUserId = localStorage.getItem('userId');
  this.emit('new-message', {
    ...message,
    isOwn: message.senderId === currentUserId,
    // ^^^ PROBLEM: Reading from localStorage in every message
  });
});
```

**Issues**:
- localStorage read on every message received
- userId could be stale if user logs out
- No access to Redux store to check auth state
- Should get userId from Redux state or Context

---

## 4. Architectural Issues

### 4.1 No Chat Slice in Redux

**Missing**: `src/store/slices/chatSlice.ts`

**Should Contain**:
```typescript
interface ChatState {
  conversations: Conversation[];
  selectedConversationId: string | null;
  messages: Record<string, ChatMessage[]>; // Keyed by conversationId
  typingUsers: Record<string, TypingUser[]>;
  loading: boolean;
  error: string | null;
}
```

**Thunks Needed**:
- `fetchConversations(filters?)` - GET /api/chat/conversations
- `fetchMessages(conversationId)` - GET /api/chat/conversations/:id/messages
- `sendMessage({ conversationId, content })` - Socket.IO emit
- `markAsRead(conversationId)` - Socket.IO emit
- `updateTypingStatus({ conversationId, isTyping })` - Socket.IO emit

### 4.2 No Socket Middleware

**Missing**: `src/store/middleware/socketMiddleware.ts`

**Should Handle**:
```typescript
// Listen to Redux actions and emit socket events
case 'chat/sendMessage/pending':
  socket.emit('send-message', action.payload);

// Listen to socket events and dispatch Redux actions
socket.on('new-message', (message) => {
  dispatch(chatActions.messageReceived(message));
});

socket.on('user-typing', (data) => {
  dispatch(chatActions.typingStatusChanged(data));
});
```

**Benefits**:
- Centralized socket event handling
- Redux DevTools shows socket events
- Easy to add logging, analytics
- Can batch updates
- Can debounce typing indicators

### 4.3 API Layer Duplication

**Two Separate API Clients**:

1. **Main API Client**: `src/lib/api.ts`
   - Used by all Redux slices
   - Has token refresh logic
   - 80+ lines of shared logic

2. **Chat API Client**: `src/lib/api/chatApi.ts`
   - Separate `fetchWithAuth` function (lines 15-39)
   - Duplicates auth header logic
   - No token refresh
   - 261 lines

**Problem**: 
- Code duplication
- Inconsistent error handling
- Chat API doesn't benefit from main client's token refresh

**Should Be**: 
- Chat API uses main `apiClient`
- Add `apiClient.chat.*` methods
- Reuse existing patterns

### 4.4 No Persistence Strategy

**Current Persistence**:
- ❌ Redux: No persistence (resets on refresh)
- ✅ Auth token: localStorage (manual in AuthContext)
- ✅ User ID: localStorage (manual in AuthContext)
- ✅ Navigation: localStorage (manual in App.tsx)
- ❌ Cart: Not persisted (lost on refresh)
- ❌ Chat: Not persisted (lost on refresh)

**Should Use**:
- Redux Persist middleware
- Whitelist important slices (auth, cart)
- Blacklist temporary data (loading states)

---

## 5. Impact Assessment

### 5.1 Bugs Caused by State Fragmentation

**Confirmed Issues**:

1. **Group/Chat Desync** (HIGH):
   - User removed from group can still see/send messages
   - Location: `GroupDetailNew.tsx` lines 52, 62

2. **Cart Lost on Navigation** (MEDIUM):
   - User adds items to cart
   - Navigates to products
   - Returns to cart
   - Cart is empty
   - Location: `GroupCart.tsx` line 32

3. **userId Stale in Socket** (MEDIUM):
   - User logs out
   - Socket still has old userId from localStorage
   - New messages show wrong `isOwn` flag
   - Location: `chatSocket.ts` line 92

4. **Optimistic Messages Never Sent** (LOW):
   - Network fails during message send
   - Message stays in UI with temp ID
   - User doesn't know it failed
   - Location: `useChat.ts` line 184

### 5.2 Maintenance Issues

**Developer Pain Points**:

1. **Three Ways to Get User Data**:
   ```typescript
   // Option 1: Context
   const { user } = useAuth();
   
   // Option 2: localStorage
   const userId = localStorage.getItem('userId');
   
   // Option 3: Redux (admin only)
   const users = useAppSelector(selectUsers);
   ```
   Developer must remember which to use when.

2. **Chat Not in DevTools**:
   - Can't debug chat state
   - Can't replay chat actions
   - Can't inspect socket events
   - Hard to reproduce bugs

3. **Socket Logic Scattered**:
   - Socket connection: `chatSocket.ts`
   - Socket events: `useChat.ts` hook
   - Socket usage: 5+ components
   - No central event log

4. **Prop Drilling in Chat**:
   ```typescript
   // ChatDashboardReal → ChatWindowReal → useConversation
   // Must pass conversationId through props
   // Could get from Redux instead
   ```

### 5.3 Performance Impact

**Current**: Minimal performance issues

**Potential Issues**:
- Multiple chat components call `useChat()` independently (duplicate fetches)
- Socket events trigger useState updates (more re-renders than Redux)
- No memoization in chat selectors (every message causes new array)

**With Redux**:
- Memoized selectors prevent unnecessary re-renders
- Single source prevents duplicate fetches
- Easier to implement message virtualization

---

## 6. Recommended Refactoring Plan

### Phase 1: Auth Consolidation (Quick Win - 1-2 days)

**Goal**: Move auth state to Redux

1. **Create `authSlice.ts`**:
   ```typescript
   interface AuthState {
     user: User | null;
     token: string | null;
     isLoading: boolean;
     error: string | null;
   }
   
   // Thunks
   - login({ email, password })
   - signup({ email, password, name, role })
   - logout()
   - refreshToken()
   - loadUserFromToken()
   ```

2. **Deprecate AuthContext**:
   - Keep `AuthProvider` shell for backwards compatibility
   - Internals use Redux instead of useState
   - Gradually migrate components to `useAppSelector(selectAuth)`

3. **Remove localStorage.userId**:
   - Get userId from Redux state instead
   - Update `chatSocket.ts` line 92

**Benefits**:
- ✅ Single source of truth for auth
- ✅ Auth state in Redux DevTools
- ✅ Easier testing
- ✅ Token refresh logic in Redux middleware

**Files to Change**: 3 files
**Risk**: LOW (auth is stable, well-tested pattern)

---

### Phase 2: Chat System Migration (Major Refactor - 3-5 days)

**Goal**: Move entire chat system to Redux

#### Step 1: Create Chat Slice

**File**: `src/store/slices/chatSlice.ts` (NEW)

```typescript
interface ChatState {
  // Conversations
  conversations: Conversation[];
  conversationsLoading: boolean;
  conversationsError: string | null;
  
  // Messages (keyed by conversationId)
  messagesByConversation: Record<string, ChatMessage[]>;
  messagesLoading: Record<string, boolean>;
  messagesError: Record<string, string | null>;
  
  // UI State
  selectedConversationId: string | null;
  
  // Real-time State
  typingUsers: Record<string, TypingUser[]>; // By conversationId
  onlineUsers: Record<string, boolean>; // By userId
  
  // Optimistic Updates
  pendingMessages: ChatMessage[]; // Messages being sent
}

// Thunks
export const fetchConversations = createAsyncThunk(...);
export const fetchMessages = createAsyncThunk(...);
export const sendMessage = createAsyncThunk(...); // With optimistic update

// Reducers
- conversationsFetched
- messageReceived (from socket)
- typingStatusChanged (from socket)
- userOnlineStatusChanged (from socket)
- optimisticMessageAdded
- optimisticMessageConfirmed
- optimisticMessageFailed
```

**Estimated**: 200-300 lines

#### Step 2: Create Socket Middleware

**File**: `src/store/middleware/socketMiddleware.ts` (NEW)

```typescript
import { chatSocket } from '../../lib/socket/chatSocket';
import { chatActions } from '../slices/chatSlice';

export const socketMiddleware = (store) => (next) => (action) => {
  // Handle outgoing actions → socket events
  switch (action.type) {
    case 'chat/sendMessage/pending':
      chatSocket.sendMessage(
        action.meta.arg.conversationId,
        action.meta.arg.content
      );
      break;
      
    case 'chat/sendTypingIndicator':
      chatSocket.sendTypingIndicator(
        action.payload.conversationId,
        action.payload.isTyping
      );
      break;
  }
  
  // Pass action to next middleware
  const result = next(action);
  
  // Setup socket listeners (on first action)
  if (!socketMiddleware.initialized) {
    chatSocket.on('new-message', (message) => {
      store.dispatch(chatActions.messageReceived(message));
    });
    
    chatSocket.on('user-typing', (data) => {
      store.dispatch(chatActions.typingStatusChanged(data));
    });
    
    chatSocket.on('user-online-status', (data) => {
      store.dispatch(chatActions.userOnlineStatusChanged(data));
    });
    
    socketMiddleware.initialized = true;
  }
  
  return result;
};
```

**Estimated**: 100-150 lines

#### Step 3: Update Socket Service

**File**: `src/lib/socket/chatSocket.ts`

**Changes**:
- Remove line 92: `localStorage.getItem('userId')` 
- Add method: `setUserId(userId)` - called from Redux
- Simplify event emitters (middleware handles Redux dispatch)

**Estimated**: Refactor 50 lines

#### Step 4: Update Components

**Files to Update**:

1. **`ChatDashboardReal.tsx`**:
   ```typescript
   // OLD
   const { conversations, loading } = useChat();
   
   // NEW
   const dispatch = useAppDispatch();
   const conversations = useAppSelector(selectConversations);
   const loading = useAppSelector(selectConversationsLoading);
   
   useEffect(() => {
     dispatch(fetchConversations());
   }, [dispatch]);
   ```

2. **`ChatWindowReal.tsx`**:
   ```typescript
   // OLD
   const { messages, sendMessage } = useConversation(conversationId);
   
   // NEW
   const messages = useAppSelector(state => 
     selectMessagesByConversation(state, conversationId)
   );
   const sendMessage = (content) => 
     dispatch(chatActions.sendMessage({ conversationId, content }));
   ```

3. **`GroupDetailNew.tsx`**:
   ```typescript
   // Remove line 38: import { useChat }
   // Remove line 62: const { conversations } = useChat()
   // Replace with Redux selectors
   const conversations = useAppSelector(state =>
     selectConversationsByGroup(state, groupId)
   );
   ```

#### Step 5: Delete Old Files

- `src/hooks/useChat.ts` - DELETE (306 lines)
- `src/lib/api/chatApi.ts` - MIGRATE to `apiClient.chat.*`

**Total Estimated Effort**: 3-5 days
**Risk**: MEDIUM-HIGH (core functionality, needs thorough testing)

**Benefits**:
- ✅ Chat state in Redux DevTools
- ✅ Time-travel debugging for chat
- ✅ Centralized socket event handling
- ✅ Optimistic updates with rollback
- ✅ No prop drilling
- ✅ Chat state accessible anywhere
- ✅ Easier testing (mock Redux, not hooks)

---

### Phase 3: Cart & Navigation (Quick Win - 1 day)

#### Cart Slice

**File**: `src/store/slices/cartSlice.ts` (NEW)

```typescript
interface CartState {
  items: CartItem[];
  groupId: string | null;
}

interface CartItem {
  productId: string;
  quantity: number;
  allocations: { memberId: string; quantity: number }[];
}

// Actions
- addToCart
- updateQuantity
- removeFromCart
- clearCart
- setAllocations
```

**Update**: `GroupCart.tsx` to use Redux

**Estimated**: 100 lines + 50 lines refactor

#### Navigation Slice (Alternative to React Router)

**File**: `src/store/slices/navigationSlice.ts` (NEW)

```typescript
interface NavigationState {
  currentScreen: Screen;
  selectedGroupId: string | null;
  history: Screen[];
}

// Actions
- navigate({ screen, groupId? })
- goBack()
```

**OR Better**: Migrate to React Router
- Use `react-router-dom`
- Routes in `App.tsx`
- URL-based navigation (better UX)

**Estimated**: 4-6 hours with React Router

---

### Phase 4: localStorage Cleanup (1 day)

1. **Install redux-persist**:
   ```bash
   npm install redux-persist
   ```

2. **Configure Persistence**:
   ```typescript
   // src/store/store.ts
   import { persistStore, persistReducer } from 'redux-persist';
   import storage from 'redux-persist/lib/storage';
   
   const persistConfig = {
     key: 'root',
     storage,
     whitelist: ['auth', 'cart'], // Only persist these
     blacklist: ['products', 'vendors'], // Refetch these
   };
   ```

3. **Remove Manual localStorage**:
   - Delete lines in `App.tsx`: 141-142, 184-195
   - Delete lines in `AuthContext.tsx`: 86, 109, 122-123
   - Keep only token management (handled by redux-persist)

4. **Update All localStorage.getItem Calls**:
   - Replace with Redux selectors
   - Keep only `auth_token` reads for API client

**Estimated**: 4-6 hours

---

## 7. Priority Ranking

### Priority 1: CRITICAL (Do First) 🔴

**Chat System Migration** (Phase 2)
- **Reason**: Largest violation, causing bugs, blocking features
- **Impact**: Fixes group/chat desync, enables chat persistence, improves debugging
- **Effort**: 3-5 days
- **Risk**: Medium-high (needs testing)

### Priority 2: HIGH (Do Soon) 🟡

**Auth Consolidation** (Phase 1)
- **Reason**: Quick win, fixes user data duplication
- **Impact**: Single source for auth, easier to add features (2FA, etc.)
- **Effort**: 1-2 days
- **Risk**: Low

**Cart Slice** (Phase 3a)
- **Reason**: User-facing bug (cart lost on navigation)
- **Impact**: Better UX, enables cart persistence
- **Effort**: 4-6 hours
- **Risk**: Low

### Priority 3: MEDIUM (Nice to Have) 🟢

**localStorage Cleanup** (Phase 4)
- **Reason**: Technical debt, prevents future bugs
- **Impact**: Cleaner architecture, automatic persistence
- **Effort**: 4-6 hours
- **Risk**: Low

**Navigation Migration** (Phase 3b)
- **Reason**: Improves UX (URLs, back button)
- **Impact**: Better user experience, shareable links
- **Effort**: 4-6 hours (with React Router)
- **Risk**: Low

---

## 8. Code Structure Recommendations

### Recommended Slice Structure

```
src/store/
├── store.ts                    # Configure store with middleware
├── index.ts                    # Central exports
├── hooks.ts                    # useAppDispatch, useAppSelector
│
├── slices/
│   ├── authSlice.ts           # NEW - Auth state
│   ├── chatSlice.ts           # NEW - Chat state
│   ├── cartSlice.ts           # NEW - Cart state
│   ├── navigationSlice.ts     # NEW - Navigation (or use React Router)
│   ├── groupsSlice.ts         # EXISTING ✅
│   ├── productsSlice.ts       # EXISTING ✅
│   ├── vendorsSlice.ts        # EXISTING ✅
│   ├── ordersSlice.ts         # EXISTING ✅
│   ├── escrowSlice.ts         # EXISTING ✅
│   └── usersSlice.ts          # EXISTING ✅
│
├── selectors/
│   ├── authSelectors.ts       # NEW
│   ├── chatSelectors.ts       # NEW
│   ├── cartSelectors.ts       # NEW
│   └── [existing selectors]   # ✅
│
└── middleware/
    ├── socketMiddleware.ts    # NEW - Handle socket events
    └── persistMiddleware.ts   # NEW - redux-persist config
```

### Recommended File Deletions

After migration:
- ❌ `src/hooks/useChat.ts` (move to Redux)
- ❌ `src/contexts/AuthContext.tsx` (move to Redux, or keep as thin wrapper)
- ❌ `src/lib/api/chatApi.ts` (merge into main apiClient)

### Recommended File Moves

- Move socket client to middleware:
  - `src/lib/socket/chatSocket.ts` → `src/store/middleware/chatSocket.ts`

---

## 9. Testing Strategy

### Before Refactoring

1. **Document Current Behavior**:
   - Create test scenarios for chat flow
   - Screenshot current UI states
   - List all socket events and expected outcomes

2. **Add Integration Tests**:
   - Test chat message flow end-to-end
   - Test group join → chat creation flow
   - Test logout → chat cleanup flow

### During Refactoring

1. **Feature Flags**:
   ```typescript
   const USE_REDUX_CHAT = process.env.VITE_REDUX_CHAT === 'true';
   
   // In component
   const conversations = USE_REDUX_CHAT 
     ? useAppSelector(selectConversations)
     : useChat().conversations;
   ```
   Allows gradual migration and easy rollback.

2. **Parallel Implementation**:
   - Keep old `useChat` hook working
   - Build new Redux slice alongside
   - Switch components one by one
   - Delete old code when all migrated

### After Refactoring

1. **Redux DevTools Verification**:
   - Verify all actions appear in DevTools
   - Check state structure matches spec
   - Test time-travel debugging

2. **Socket Event Log**:
   - Add middleware logging for all socket events
   - Verify events dispatch correct actions

3. **Regression Testing**:
   - Test all chat features work as before
   - Test edge cases (reconnection, logout, errors)
   - Load test (100+ messages, 10+ conversations)

---

## 10. Conclusion

### Current State: ⚠️ FRAGMENTED

The application has **4 separate state management systems**:
1. Redux (6 slices) ✅
2. React Context (auth) ❌
3. Custom hooks (chat) ❌❌❌
4. localStorage (direct access) ❌

This violates the **single source of truth** principle and causes:
- State synchronization bugs
- Maintenance complexity
- Poor debugging experience
- Missing features (chat persistence)

### After Refactoring: ✅ UNIFIED

All state in Redux:
1. Auth slice → Single source for user data
2. Chat slice → Debuggable, testable chat
3. Cart slice → Persistent cart
4. Navigation slice OR React Router → Better UX
5. Redux Persist → Automatic persistence

**Benefits**:
- 🎯 Single source of truth
- 🐛 Easier debugging (Redux DevTools)
- 🧪 Easier testing (mock Redux)
- 📦 Automatic persistence
- 🔌 Centralized socket handling
- ⚡ Better performance (memoization)
- 🔄 Time-travel debugging
- 📱 Feature flags and rollbacks

### Total Effort Estimate

| Phase | Days | Priority |
|-------|------|----------|
| 1. Auth Consolidation | 1-2 | HIGH |
| 2. Chat Migration | 3-5 | CRITICAL |
| 3. Cart & Navigation | 1 | HIGH |
| 4. localStorage Cleanup | 0.5 | MEDIUM |
| **TOTAL** | **5.5-8.5 days** | |

### Recommended Order

1. **Week 1**: Chat Migration (Phase 2) - Biggest bang for buck
2. **Week 2**: Auth + Cart (Phases 1 & 3) - Quick wins
3. **Week 3**: Cleanup + Testing (Phase 4) - Polish

---

## Appendix: Quick Reference

### Files with State Management Issues

| File | Issue | Severity | Lines |
|------|-------|----------|-------|
| `src/hooks/useChat.ts` | Local state instead of Redux | 🔴 CRITICAL | 19-21, 132-137 |
| `src/contexts/AuthContext.tsx` | Duplicate user state | 🟡 HIGH | 22-23, 86, 109 |
| `src/lib/socket/chatSocket.ts` | localStorage in socket handler | 🟡 HIGH | 92, 192, 281 |
| `src/App.tsx` | Navigation in component state | 🟢 MEDIUM | 83-84, 141-195 |
| `src/components/products/GroupCart.tsx` | Cart in component state | 🟢 MEDIUM | 32-50 |
| `src/components/groups/GroupDetailNew.tsx` | Mixes Redux + useChat | 🟡 HIGH | 38, 52, 62 |

### Key Metrics

- **Redux Slices**: 6 (groups, products, vendors, orders, escrow, users)
- **Missing Slices**: 3-4 (auth, chat, cart, navigation)
- **localStorage Calls**: 47 instances
- **Custom Hooks with State**: 1 major (`useChat` - 306 lines)
- **React Context**: 1 (`AuthContext` - 158 lines)
- **Components with Local State**: 40+ (mostly form state, OK)
- **State Management Violations**: ~15 critical instances

---

**Report Generated**: 2026  
**Audit Completed By**: Frontend Advisor Agent  
**Status**: COMPLETE  

**Next Steps**: Review with team → Prioritize phases → Begin Phase 2 (Chat Migration)
