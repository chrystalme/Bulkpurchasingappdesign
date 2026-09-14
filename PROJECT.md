# Project: Bulk Purchasing App Full-Stack Fixes & Real-Time Sync

## Architecture
- **Frontend**: React + TypeScript (Vite), Redux Toolkit with `redux-persist`, Socket.IO client, TailwindCSS, `shadcn/ui`.
- **Backend**: Node.js (Express), Socket.IO server, PostgreSQL client (`pg`), JWT authentication with role-based access control.
- **Database**: PostgreSQL with relational schema across users, vendors, products, groups, group_members, group_cart_items, group_cart_allocations, orders, order_items, escrow_transactions, conversations, conversation_participants, messages.
- **Real-Time Data Flow**:
  - Cart: Mutations via REST `/api/groups/:groupId/cart/*` broadcast `cart-updated` / `cart-cleared` events to Socket.IO room `cart:${groupId}`.
  - Chat: Group-vendor and group-internal messages via REST/Socket broadcast `new-message` to Socket.IO room `conversation:${conversationId}`. Read access transparent to all group members; send access restricted to group admin and vendor.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Cart Tables Migration | Create `group_cart_items` and `group_cart_allocations` tables with unique constraints and foreign keys in `011_create_group_cart_tables.sql` | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Seed Realignment | Restructure `backend/db/seed.js` for cohesive entities: Tech Accessories with Tech Wholesale Hub, Office Supplies with Office Essentials Plus, Groceries with Fresh Farm Collective | M1 | ORIGINAL_REQUEST §R3 |
| 3 | Seed Orders & Escrow Fix | Realign seed orders, items, and escrow records so seller_id matches actual product vendor | M1 | ORIGINAL_REQUEST §R3 |
| 4 | Chat Auto-Enrollment Triggers | Update database triggers so group members are enrolled as participants in group-vendor chats with `can_send = (role = 'admin')` | M1 | ORIGINAL_REQUEST §R2 |
| 5 | Cart REST API | Implement GET/POST/PATCH/DELETE endpoints for group cart and member allocations at `/api/groups/:groupId/cart` | M2 | ORIGINAL_REQUEST §R1 |
| 6 | Cart Socket.IO Sync | Implement Socket.IO room `cart:${groupId}` with `join-cart`, `leave-cart`, and `cart-updated` real-time broadcasting | M2 | ORIGINAL_REQUEST §R1 |
| 7 | Frontend Redux Cart Persistence | Update `cartSlice.ts` with async thunks to fetch, add, update, and remove cart items and allocations from backend API | M2 | ORIGINAL_REQUEST §R1 |
| 8 | Group Cart UI Sync | Update `GroupCart.tsx` and `AddToGroupCartDialog.tsx` to read from backend cart and handle multi-member real-time updates | M2 | ORIGINAL_REQUEST §R1 |
| 9 | Chat Member Read Visibility | Update `getUserConversations` and message access checks in `chat.controller.js` so group members can see and read group-vendor chats | M3 | ORIGINAL_REQUEST §R2 |
| 10 | Chat Send Permission Controls | Enforce strict send permissions (only group admin and vendor can send) in backend controller, socket handler, and frontend `ChatWindowReal.tsx` | M3 | ORIGINAL_REQUEST §R2 |
| 11 | Chioma Chat Accessibility | Verify Chioma in Tech Accessories sees "Tech Wholesale Hub" chat under vendor tab with read-only observer banner | M3 | ORIGINAL_REQUEST §R2 |
| 12 | Automated Verification & Tests | Automated Jest test suites for cart persistence/sync, chat queries/permissions, seed integrity, and clean `npm run build` | M4 | ORIGINAL_REQUEST §Verification |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | DB Schema, Triggers & Seed Realignment | Migration 011, chat triggers, restructure `seed.js`, clean `npm run reset` | none | DONE |
| 2 | Group Cart Persistence & Real-Time Sync | REST endpoints, Socket.IO cart room, Redux slice thunks, `GroupCart.tsx`, `AddToGroupCartDialog.tsx` | M1 | DONE |
| 3 | Group-Vendor Chat Visibility & Permissions | `chat.controller.js`, `chat.socket.js`, `ChatDashboardReal.tsx`, `ChatWindowReal.tsx`, `useChat.ts` | M1 | DONE |
| 4 | Final Integration, Automated Tests & Build | Jest integration suites (`cart.test.js`, `chat.visibility.test.js`, `seed.integrity.test.js`), `npm run build` | M1, M2, M3 | IN_PROGRESS |


## Interface Contracts

### Backend Cart REST API
- `GET /api/groups/:groupId/cart`
  - Headers: `Authorization: Bearer <token>`
  - Response: `{ success: true, data: { groupId: string, items: CartItemData[] } }`
- `POST /api/groups/:groupId/cart/items`
  - Body: `{ productId: string, quantity: number, memberId?: string }`
  - Response: `{ success: true, data: { groupId: string, items: CartItemData[] } }`
- `PATCH /api/groups/:groupId/cart/items/:productId`
  - Body: `{ delta?: number, quantity?: number }`
  - Response: `{ success: true, data: { groupId: string, items: CartItemData[] } }`
- `PATCH /api/groups/:groupId/cart/items/:productId/allocations/:memberId`
  - Body: `{ quantity?: number, paid?: boolean }`
  - Response: `{ success: true, data: { groupId: string, items: CartItemData[] } }`
- `DELETE /api/groups/:groupId/cart/items/:productId`
  - Response: `{ success: true, data: { groupId: string, items: CartItemData[] } }`
- `DELETE /api/groups/:groupId/cart`
  - Response: `{ success: true, data: null }`

### Socket.IO Cart Events
- Room: `cart:${groupId}`
- Client -> Server:
  - `join-cart`: `{ groupId: string }`
  - `leave-cart`: `{ groupId: string }`
- Server -> Client:
  - `cart-updated`: `{ groupId: string, items: CartItemData[], updatedBy: string }`
  - `cart-cleared`: `{ groupId: string, clearedBy: string }`

### Chat Permissions Contract
- In `conversations` of `type = 'group-vendor'`:
  - Group Admin (`gm.role = 'admin'`): `can_send = true`
  - Vendor (`c.vendor_id = user.id`): `can_send = true`
  - Group Member (`gm.role = 'member'`): `can_send = false` (Read-only observation)
  - Non-group-member: 403 Forbidden

## Code Layout
- Database Migrations: `backend/migrations/011_create_group_cart_tables.sql`, `backend/db/migrate.js`, `backend/db/schema.sql`, `backend/db/seed.js`
- Backend Cart: `backend/routes/cart.routes.js`, `backend/controllers/cart.controller.js`, `backend/socket/cart.socket.js`, `backend/server.js`
- Backend Chat: `backend/controllers/chat.controller.js`, `backend/socket/chat.socket.js`
- Frontend API & Socket: `src/lib/api.ts`, `src/lib/socket/chatSocket.ts`, `src/store/middleware/chatSocketMiddleware.ts`
- Frontend Redux: `src/store/slices/cartSlice.ts`, `src/store/slices/chatSlice.ts`
- Frontend UI: `src/components/products/GroupCart.tsx`, `src/components/products/AddToGroupCartDialog.tsx`, `src/components/chat/ChatDashboardReal.tsx`, `src/components/chat/ChatWindowReal.tsx`
- Tests: `backend/__tests__/cart.test.js`, `backend/__tests__/chat.visibility.test.js`, `backend/__tests__/seed.integrity.test.js`
