# Single Source of Truth - Violations Quick Reference

**🔴 = CRITICAL** | **🟡 = HIGH** | **🟢 = MEDIUM** | **⚪ = LOW**

---

## Critical Violations (Fix Immediately)

### 🔴 1. Chat System Outside Redux

**Files**: 
- `src/hooks/useChat.ts` (306 lines)
- `src/components/chat/ChatWindowReal.tsx`
- `src/components/chat/ChatDashboardReal.tsx`

**Problem**: Entire chat system uses local `useState` hooks

**Impact**:
- No Redux DevTools visibility
- State desyncs with groups
- No persistence
- Prop drilling required
- Hard to test

**Solution**: Create `chatSlice.ts` + socket middleware

**Effort**: 3-5 days

---

### 🔴 2. localStorage Direct Reads in Socket Handler

**File**: `src/lib/socket/chatSocket.ts:92`

```typescript
const currentUserId = localStorage.getItem('userId');
this.emit('new-message', {
  ...message,
  isOwn: message.senderId === currentUserId, // ❌ Wrong!
});
```

**Problem**: 
- Socket handler reads from localStorage every message
- userId could be stale after logout
- No access to Redux auth state

**Impact**: Messages show wrong ownership after logout

**Solution**: Get userId from Redux state in socket middleware

**Effort**: 2 hours (part of chat migration)

---

### 🔴 3. Group + Chat State Desync

**File**: `src/components/groups/GroupDetailNew.tsx:52,62`

```typescript
const { currentGroup } = useAppSelector(state => state.groups); // Redux
const { conversations } = useChat(); // Local state
```

**Problem**: Two separate state sources for related data

**Impact**: 
- User removed from group can still send chat messages
- Conversations don't update when group changes

**Solution**: Chat in Redux, check group membership before allowing chat access

**Effort**: Part of chat migration

---

## High Priority Violations (Fix Soon)

### 🟡 1. Auth State Duplication

**Files**:
- `src/contexts/AuthContext.tsx:22-23,42`
- `src/store/slices/usersSlice.ts:21`
- localStorage userId

**Problem**: THREE sources of user data

```typescript
// Source 1: AuthContext
const { user } = useAuth(); // User object

// Source 2: localStorage
const userId = localStorage.getItem('userId'); // Just ID

// Source 3: Redux (admin only)
const users = useAppSelector(selectUsers); // User array
```

**Impact**: Confusion over which to use, potential stale data

**Solution**: Create `authSlice.ts`, move AuthContext logic to Redux

**Effort**: 1-2 days

---

### 🟡 2. Cart State Lost on Navigation

**File**: `src/components/products/GroupCart.tsx:32-50`

```typescript
const [cartItems, setCartItems] = useState<CartItemData[]>([...]);
```

**Problem**: Cart stored in component state, lost on unmount

**Impact**: 
- User adds items
- Navigates away
- Returns to cart
- Cart is empty!

**Solution**: Create `cartSlice.ts`

**Effort**: 4-6 hours

---

### 🟡 3. Optimistic Updates Without Rollback

**File**: `src/hooks/useChat.ts:173-184`

```typescript
const optimisticMessage = { id: `temp-${Date.now()}`, ... };
setMessages(prev => [...prev, optimisticMessage]);
chatSocket.sendMessage(conversationId, content);
// ❌ No error handling! Message stays in UI even if socket fails
```

**Problem**: Failed messages never removed from UI

**Impact**: User thinks message sent, but it wasn't

**Solution**: Redux thunk with `.catch()` rollback

**Effort**: Part of chat migration

---

## Medium Priority Violations

### 🟢 1. Navigation State Duplication

**File**: `src/App.tsx:83-84,141-195`

```typescript
const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

// ALSO stored in localStorage
localStorage.setItem('lastScreen', screen);
localStorage.setItem('lastGroupId', groupId);
```

**Problem**: Same state in component + localStorage, manual sync

**Solution**: Use React Router OR Redux navigation slice

**Effort**: 4-6 hours

---

### 🟢 2. API Client Duplication

**Files**:
- `src/lib/api.ts` (main client)
- `src/lib/api/chatApi.ts` (separate client)

**Problem**: Two `fetchWithAuth` implementations

**Impact**: Chat API doesn't get token refresh logic

**Solution**: Merge chat API into main `apiClient.chat.*`

**Effort**: 2 hours

---

### 🟢 3. Manual localStorage Sync

**Files**:
- `src/contexts/AuthContext.tsx:86,109,122-123`
- `src/App.tsx:184-195`

**Problem**: Manual `localStorage.setItem/getItem` calls scattered around

**Solution**: Use `redux-persist` middleware for automatic sync

**Effort**: 4-6 hours

---

## File-by-File Violation Map

| File | Violations | Severity | Lines |
|------|-----------|----------|-------|
| `src/hooks/useChat.ts` | Local state for chat | 🔴 CRITICAL | 19-21, 132-137 |
| `src/lib/socket/chatSocket.ts` | localStorage in handler | 🔴 CRITICAL | 92 |
| `src/components/groups/GroupDetailNew.tsx` | Mixed Redux + hooks | 🔴 CRITICAL | 52, 62 |
| `src/contexts/AuthContext.tsx` | Duplicate auth state | 🟡 HIGH | 22-23, 42, 86, 109 |
| `src/components/products/GroupCart.tsx` | Cart in component state | 🟡 HIGH | 32-50 |
| `src/hooks/useChat.ts` | No optimistic rollback | 🟡 HIGH | 173-184 |
| `src/App.tsx` | Navigation state duplication | 🟢 MEDIUM | 83-84, 141-195 |
| `src/lib/api/chatApi.ts` | Separate API client | 🟢 MEDIUM | 15-39 |
| `src/lib/api.ts` | Manual localStorage reads | 🟢 MEDIUM | 80, 85 |

---

## Search Patterns to Find Issues

### Find localStorage usage:
```bash
grep -r "localStorage\." src/ --include="*.ts" --include="*.tsx"
```
**Result**: 47 instances (10 are violations)

### Find useState in hooks:
```bash
grep -r "useState" src/hooks/ --include="*.ts"
```
**Result**: `useChat.ts` has 5 instances (all violations)

### Find Context usage:
```bash
grep -r "createContext" src/ --include="*.tsx"
```
**Result**: `AuthContext.tsx` is the main violation

### Find components mixing Redux + hooks:
```bash
grep -l "useAppSelector\|useSelector" src/components/**/*.tsx | xargs grep -l "useChat"
```
**Result**: `GroupDetailNew.tsx` (violation)

---

## Quick Fix Priority Order

### Week 1: Chat Migration
1. ✅ Create `chatSlice.ts`
2. ✅ Create `socketMiddleware.ts`
3. ✅ Refactor `ChatDashboardReal.tsx`
4. ✅ Refactor `ChatWindowReal.tsx`
5. ✅ Refactor `GroupDetailNew.tsx`
6. ✅ Delete `useChat.ts` hook
7. ✅ Test thoroughly

**Impact**: Fixes 50% of violations

---

### Week 2: Auth + Cart
1. ✅ Create `authSlice.ts`
2. ✅ Move AuthContext logic to Redux
3. ✅ Update all auth consumers
4. ✅ Create `cartSlice.ts`
5. ✅ Refactor `GroupCart.tsx`

**Impact**: Fixes 30% of violations

---

### Week 3: Cleanup
1. ✅ Migrate to React Router (or create navigation slice)
2. ✅ Setup `redux-persist`
3. ✅ Remove manual localStorage sync
4. ✅ Consolidate API clients

**Impact**: Fixes remaining 20%

---

## Testing Checklist

After each fix, verify:

- [ ] Redux DevTools shows correct state
- [ ] No console errors
- [ ] Feature works as before
- [ ] No performance regression
- [ ] Tests pass
- [ ] TypeScript compiles
- [ ] Linter passes

---

## Metrics to Track

### Before Refactoring

| Metric | Value |
|--------|-------|
| State Management Systems | 4 (Redux, Context, Hooks, localStorage) |
| localStorage Calls | 47 |
| Custom State Hooks | 1 (`useChat`) |
| React Context | 1 (`AuthContext`) |
| Lines of Hook Code | 306 (`useChat.ts`) |
| Components with Local State | 40+ |

### After Refactoring (Target)

| Metric | Value |
|--------|-------|
| State Management Systems | 1 (Redux only) |
| localStorage Calls | 0 (managed by redux-persist) |
| Custom State Hooks | 0 |
| React Context | 0 (moved to Redux) |
| Redux Slices | 10 (6 existing + 4 new) |
| Socket Middleware | 1 |

---

## Success Criteria

### Chat Migration Success
✅ All chat actions visible in Redux DevTools  
✅ Time-travel debugging works for chat  
✅ No `useChat` imports in codebase  
✅ Chat state persists across page refresh (with redux-persist)  
✅ Group/chat state synchronized  
✅ Optimistic updates with rollback work  
✅ All tests pass  

### Auth Migration Success
✅ Single source of truth for user data  
✅ No `useAuth` returning local state  
✅ No duplicate user storage  
✅ Auth token refresh in Redux  
✅ All tests pass  

### Cart Migration Success
✅ Cart persists across navigation  
✅ Cart count visible in nav bar  
✅ Checkout prefilled from Redux  
✅ All tests pass  

### Overall Success
✅ All state in Redux (except UI-only form state)  
✅ Zero manual localStorage reads (except in redux-persist)  
✅ No prop drilling for shared state  
✅ Redux DevTools shows complete app state  
✅ Time-travel debugging works  
✅ All features work as before  
✅ No performance regressions  

---

## Common Pitfalls to Avoid

### ❌ DON'T: Mix Old and New Patterns
```typescript
// BAD: Using both useChat and Redux in same component
const { conversations } = useChat(); // Old
const messages = useAppSelector(selectMessages); // New
```

### ✅ DO: Full Migration Per Component
```typescript
// GOOD: All state from Redux
const conversations = useAppSelector(selectConversations);
const messages = useAppSelector(selectMessages);
```

---

### ❌ DON'T: Read localStorage Directly
```typescript
// BAD
const userId = localStorage.getItem('userId');
```

### ✅ DO: Use Redux Selectors
```typescript
// GOOD
const userId = useAppSelector(selectCurrentUserId);
```

---

### ❌ DON'T: Optimistic Updates Without Error Handling
```typescript
// BAD
setMessages(prev => [...prev, optimisticMessage]);
socket.emit('send', message);
```

### ✅ DO: Use Redux Thunk with Rollback
```typescript
// GOOD
dispatch(sendMessage({ conversationId, content }))
  .unwrap()
  .catch(error => {
    dispatch(removeOptimisticMessage(tempId));
    toast.error('Failed to send');
  });
```

---

### ❌ DON'T: Duplicate State
```typescript
// BAD: Same data in two places
const user = useAuth().user; // Context
const currentUser = useAppSelector(selectCurrentUser); // Redux
```

### ✅ DO: Single Source
```typescript
// GOOD: Only Redux
const user = useAppSelector(selectCurrentUser);
```

---

## Resources

- **Main Audit Report**: `STATE_MANAGEMENT_AUDIT_REPORT.md`
- **Chat Migration Blueprint**: `CHAT_MIGRATION_BLUEPRINT.md`
- **Redux Toolkit Docs**: https://redux-toolkit.js.org/
- **Redux DevTools**: https://github.com/reduxjs/redux-devtools

---

## Quick Command Reference

```bash
# Find violations
grep -r "localStorage\." src/ --include="*.ts*" | wc -l
grep -r "useState" src/hooks/ --include="*.ts"
grep -r "createContext" src/ --include="*.tsx"

# Run tests
npm test

# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build

# Redux DevTools
# Install: https://github.com/reduxjs/redux-devtools-extension
```

---

**Version**: 1.0  
**Last Updated**: 2026   
**Next Review**: After Chat Migration
