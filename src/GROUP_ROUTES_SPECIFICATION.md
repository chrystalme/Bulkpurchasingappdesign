# 📋 Group Routes Specification

## Overview

The **Group Routes** are responsible for managing purchasing groups in your bulk purchasing app. These routes enable users to create groups, invite members, manage group settings, track group orders, and coordinate bulk purchases.

---

## 🎯 What Groups Are For

In your "Save Together, Buy Smarter" app, **Groups** are the core feature that allows:

1. **Collective Purchasing** - Multiple users pool together to buy in bulk
2. **Better Pricing** - Reach vendor minimum order quantities
3. **Cost Sharing** - Split bulk products among members
4. **Coordinated Buying** - Admin negotiates on behalf of all members
5. **Trust & Transparency** - Everyone sees the same information

---

## 🏗️ Group Route Architecture

### Base Route
```
/api/groups
```

### Authentication
**All group endpoints require authentication** using JWT token in headers:
```
Authorization: Bearer <jwt_token>
```

---

## 📍 Complete Endpoint List

### Group Management (9 endpoints)
1. `GET /api/groups` - List all groups
2. `GET /api/groups/:id` - Get specific group details
3. `POST /api/groups` - Create new group
4. `PUT /api/groups/:id` - Update group settings
5. `DELETE /api/groups/:id` - Delete group
6. `POST /api/groups/:id/join` - Join a group
7. `POST /api/groups/:id/leave` - Leave a group
8. `POST /api/groups/:id/invite` - Invite user to group
9. `PUT /api/groups/:id/members/:userId` - Update member role

### Group Discovery (2 endpoints)
10. `GET /api/groups/discover` - Find public/joinable groups
11. `GET /api/groups/search` - Search groups by criteria

### Group Products (3 endpoints)
12. `GET /api/groups/:id/products` - Get products group is interested in
13. `POST /api/groups/:id/products` - Add product to group wishlist
14. `DELETE /api/groups/:id/products/:productId` - Remove product from wishlist

### Group Orders (4 endpoints)
15. `GET /api/groups/:id/orders` - Get all group orders
16. `GET /api/groups/:id/orders/:orderId` - Get specific order details
17. `POST /api/groups/:id/orders` - Create group order
18. `PUT /api/groups/:id/orders/:orderId` - Update order status

### Group Analytics (3 endpoints)
19. `GET /api/groups/:id/statistics` - Get group statistics
20. `GET /api/groups/:id/savings` - Calculate total savings
21. `GET /api/groups/:id/activity` - Get group activity feed

---

## 📖 Detailed Endpoint Specifications

---

### 1. GET /api/groups

**Purpose:** List all groups the authenticated user is part of

**Authentication:** Required

**Query Parameters:**
- `status` (optional) - Filter by status: `active`, `pending`, `archived`
- `role` (optional) - Filter by user's role: `admin`, `member`
- `limit` (optional) - Number of results (default: 20)
- `offset` (optional) - Pagination offset (default: 0)

**Request Example:**
```http
GET /api/groups?status=active&role=admin
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "groups": [
    {
      "id": "uuid-1",
      "name": "Tech Enthusiasts Bulk Buy",
      "description": "Buying electronics in bulk for better prices",
      "avatar": "🖥️",
      "status": "active",
      "privacy": "public",
      "member_count": 12,
      "current_user_role": "admin",
      "created_at": "2025-01-15T10:00:00Z",
      "created_by": "uuid-user-1",
      "creator_name": "John Doe",
      "active_orders": 2,
      "total_savings": 450.50
    },
    {
      "id": "uuid-2",
      "name": "Office Supplies Group",
      "description": "Monthly office supplies bulk purchase",
      "avatar": "📎",
      "status": "active",
      "privacy": "private",
      "member_count": 5,
      "current_user_role": "member",
      "created_at": "2025-01-10T14:30:00Z",
      "created_by": "uuid-user-2",
      "creator_name": "Jane Smith",
      "active_orders": 1,
      "total_savings": 120.00
    }
  ],
  "total": 2,
  "limit": 20,
  "offset": 0
}
```

**Business Logic:**
- Only return groups where user is a member
- Include user's role in each group
- Show active order count
- Calculate total savings
- Order by most recently active

---

### 2. GET /api/groups/:id

**Purpose:** Get detailed information about a specific group

**Authentication:** Required

**URL Parameters:**
- `id` - Group UUID

**Request Example:**
```http
GET /api/groups/uuid-1
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "uuid-1",
  "name": "Tech Enthusiasts Bulk Buy",
  "description": "Buying electronics in bulk for better prices",
  "avatar": "🖥️",
  "status": "active",
  "privacy": "public",
  "created_at": "2025-01-15T10:00:00Z",
  "created_by": "uuid-user-1",
  "creator_name": "John Doe",
  "creator_avatar": "https://...",
  
  "members": [
    {
      "user_id": "uuid-user-1",
      "name": "John Doe",
      "avatar": "https://...",
      "role": "admin",
      "joined_at": "2025-01-15T10:00:00Z",
      "contribution": 1250.00,
      "orders_count": 5
    },
    {
      "user_id": "uuid-user-3",
      "name": "Bob Wilson",
      "avatar": "https://...",
      "role": "member",
      "joined_at": "2025-01-16T12:00:00Z",
      "contribution": 450.00,
      "orders_count": 2
    }
  ],
  
  "statistics": {
    "member_count": 12,
    "active_orders": 2,
    "completed_orders": 15,
    "total_spent": 15000.00,
    "total_savings": 2500.00,
    "average_savings_per_member": 208.33
  },
  
  "current_user": {
    "role": "admin",
    "can_invite": true,
    "can_remove_members": true,
    "can_edit": true,
    "can_delete": true
  }
}
```

**Business Logic:**
- User must be a member to view group details
- Calculate permissions based on user's role
- Show member contributions and activity
- Include group statistics
- If user is not a member but group is public, show limited info (no members list, no orders)

**Error Responses:**
- `404 Not Found` - Group doesn't exist
- `403 Forbidden` - User is not a member and group is private

---

### 3. POST /api/groups

**Purpose:** Create a new purchasing group

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Tech Enthusiasts Bulk Buy",
  "description": "Buying electronics in bulk for better prices",
  "avatar": "🖥️",
  "privacy": "public",
  "max_members": 20,
  "auto_accept": true,
  "category": "electronics"
}
```

**Field Descriptions:**
- `name` (required, string, 3-100 chars) - Group name
- `description` (optional, string, max 500 chars) - Group description
- `avatar` (optional, string) - Emoji or image URL
- `privacy` (required, enum: `public`|`private`) - Who can see/join
- `max_members` (optional, number, 2-1000) - Maximum members allowed
- `auto_accept` (optional, boolean) - Auto-accept join requests for public groups
- `category` (optional, string) - Product category focus

**Response (201 Created):**
```json
{
  "id": "uuid-new-group",
  "name": "Tech Enthusiasts Bulk Buy",
  "description": "Buying electronics in bulk for better prices",
  "avatar": "🖥️",
  "status": "active",
  "privacy": "public",
  "max_members": 20,
  "auto_accept": true,
  "category": "electronics",
  "created_at": "2025-01-26T14:30:00Z",
  "created_by": "uuid-current-user",
  "member_count": 1,
  "members": [
    {
      "user_id": "uuid-current-user",
      "name": "Current User",
      "role": "admin",
      "joined_at": "2025-01-26T14:30:00Z"
    }
  ]
}
```

**Business Logic:**
- Creator automatically becomes admin
- Creator automatically added to group_members table
- Generate unique group ID (UUID)
- Validate name is unique (optional - depends on business rules)
- Set default values for optional fields
- Trigger creation of internal group chat (via database trigger)
- Send notification to creator

**Validation Rules:**
- Name: 3-100 characters, required
- Description: Max 500 characters
- Max members: 2-1000
- Privacy: Must be 'public' or 'private'

**Error Responses:**
- `400 Bad Request` - Validation errors
- `409 Conflict` - Group name already exists (if enforcing uniqueness)

---

### 4. PUT /api/groups/:id

**Purpose:** Update group settings (admin only)

**Authentication:** Required (Admin role)

**URL Parameters:**
- `id` - Group UUID

**Request Body (all fields optional):**
```json
{
  "name": "Updated Group Name",
  "description": "New description",
  "avatar": "🔥",
  "privacy": "private",
  "max_members": 30,
  "auto_accept": false,
  "status": "active"
}
```

**Response (200 OK):**
```json
{
  "id": "uuid-1",
  "name": "Updated Group Name",
  "description": "New description",
  "avatar": "🔥",
  "privacy": "private",
  "max_members": 30,
  "auto_accept": false,
  "status": "active",
  "updated_at": "2025-01-26T15:00:00Z"
}
```

**Business Logic:**
- Only admins can update group settings
- Cannot reduce max_members below current member count
- Changing privacy to private doesn't kick out existing members
- Log changes in activity feed
- Notify all members of significant changes (name, privacy)

**Validation:**
- Check user is admin of this group
- Validate max_members >= current member_count
- Validate status transitions (can't activate archived group directly)

**Error Responses:**
- `403 Forbidden` - User is not admin
- `400 Bad Request` - Invalid data or constraints violated
- `404 Not Found` - Group doesn't exist

---

### 5. DELETE /api/groups/:id

**Purpose:** Delete a group (admin only)

**Authentication:** Required (Admin role)

**URL Parameters:**
- `id` - Group UUID

**Request Example:**
```http
DELETE /api/groups/uuid-1
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Group deleted successfully",
  "deleted_group_id": "uuid-1"
}
```

**Business Logic:**
- Only admins can delete groups
- Cannot delete if there are active orders (must cancel/complete first)
- Soft delete preferred (set status to 'deleted')
- Archive all group conversations
- Notify all members of deletion
- Remove all members from group
- Keep historical data for analytics

**Pre-deletion Checks:**
- No active orders exist
- No pending escrow transactions
- All disputes resolved

**Error Responses:**
- `403 Forbidden` - User is not admin
- `400 Bad Request` - Active orders exist
- `404 Not Found` - Group doesn't exist

---

### 6. POST /api/groups/:id/join

**Purpose:** Join a group (public groups) or request to join (private groups)

**Authentication:** Required

**URL Parameters:**
- `id` - Group UUID

**Request Body (optional):**
```json
{
  "message": "I'd like to join to save on office supplies!"
}
```

**Response for Public Group (201 Created):**
```json
{
  "success": true,
  "status": "joined",
  "group_id": "uuid-1",
  "role": "member",
  "joined_at": "2025-01-26T15:30:00Z",
  "message": "Successfully joined the group"
}
```

**Response for Private Group (202 Accepted):**
```json
{
  "success": true,
  "status": "pending",
  "group_id": "uuid-1",
  "message": "Join request sent to group admins",
  "request_id": "uuid-request-1"
}
```

**Business Logic:**

**For Public Groups:**
- If `auto_accept = true`: User immediately added as member
- If `auto_accept = false`: Create join request, notify admins
- Add user to group_members table
- Add user to internal group chat
- Send welcome notification

**For Private Groups:**
- Always create join request
- Notify all admins
- Store optional message from user

**Validation:**
- User is not already a member
- Group is not full (member_count < max_members)
- Group is active (status = 'active')
- User doesn't have pending join request

**Error Responses:**
- `400 Bad Request` - Already a member, group full, or pending request exists
- `404 Not Found` - Group doesn't exist
- `403 Forbidden` - Group is archived/deleted

---

### 7. POST /api/groups/:id/leave

**Purpose:** Leave a group

**Authentication:** Required

**URL Parameters:**
- `id` - Group UUID

**Request Example:**
```http
POST /api/groups/uuid-1/leave
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "You have left the group",
  "group_id": "uuid-1"
}
```

**Business Logic:**
- Remove user from group_members table
- Remove user from all group conversations
- Cannot leave if user is the only admin
- If last admin leaves, promote another member or delete group (business decision)
- Cancel any pending orders by this user
- Refund any escrow amounts
- Notify remaining members

**Special Cases:**
- **Last admin:** Must promote another member to admin first, or delete group
- **Active orders:** Cancel user's participation in pending orders
- **Escrow funds:** Automatically refund to user's wallet

**Error Responses:**
- `400 Bad Request` - User is last admin (must promote someone first)
- `404 Not Found` - User is not a member
- `403 Forbidden` - Has active financial obligations (orders in escrow)

---

### 8. POST /api/groups/:id/invite

**Purpose:** Invite a user to join the group (admin/member with permission)

**Authentication:** Required

**URL Parameters:**
- `id` - Group UUID

**Request Body:**
```json
{
  "user_id": "uuid-user-5",
  "message": "Join our office supplies group!",
  "role": "member"
}
```

**OR invite by email:**
```json
{
  "email": "newuser@example.com",
  "message": "Join our bulk buying group!",
  "role": "member"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "invitation_id": "uuid-invitation-1",
  "invited_user_id": "uuid-user-5",
  "invited_email": "user@example.com",
  "group_id": "uuid-1",
  "expires_at": "2025-02-02T15:30:00Z",
  "message": "Invitation sent successfully"
}
```

**Business Logic:**
- Check user has permission to invite (admins always can, members if allowed)
- Create invitation record with expiration (7 days default)
- Send email/in-app notification to invitee
- If user doesn't exist, send email invitation to sign up
- Track who sent the invitation

**Validation:**
- Inviter is a member (admin or has invite permission)
- Invitee is not already a member
- Group is not full
- Email is valid format (if inviting by email)

**Error Responses:**
- `403 Forbidden` - User doesn't have invite permission
- `400 Bad Request` - Invitee already member, group full
- `404 Not Found` - Group or user doesn't exist

---

### 9. PUT /api/groups/:id/members/:userId

**Purpose:** Update a member's role or status (admin only)

**Authentication:** Required (Admin role)

**URL Parameters:**
- `id` - Group UUID
- `userId` - User UUID

**Request Body:**
```json
{
  "role": "admin",
  "action": "promote"
}
```

**Actions:**
- `promote` - Change member to admin
- `demote` - Change admin to member
- `remove` - Remove user from group

**Response (200 OK):**
```json
{
  "success": true,
  "user_id": "uuid-user-3",
  "group_id": "uuid-1",
  "new_role": "admin",
  "action": "promote",
  "updated_at": "2025-01-26T16:00:00Z"
}
```

**Business Logic:**

**Promote:**
- Change user's role from 'member' to 'admin'
- Grant admin permissions (edit group, invite, remove members, etc.)
- Update group_conversation_participants to allow sending in vendor chats
- Notify user of promotion

**Demote:**
- Change user's role from 'admin' to 'member'
- Cannot demote if they're the last admin
- Remove admin permissions
- Notify user of demotion

**Remove:**
- Same as leave, but admin-initiated
- Cannot remove yourself (use leave instead)
- Notify removed user
- Log in activity feed

**Validation:**
- Acting user is admin
- Cannot demote last admin
- Target user is a member of the group
- Cannot remove yourself

**Error Responses:**
- `403 Forbidden` - User is not admin
- `400 Bad Request` - Cannot demote last admin, invalid action
- `404 Not Found` - User or group doesn't exist

---

### 10. GET /api/groups/discover

**Purpose:** Discover public groups to join

**Authentication:** Required

**Query Parameters:**
- `category` (optional) - Filter by category
- `has_slots` (optional, boolean) - Only groups with available slots
- `location` (optional) - Filter by location/region
- `limit` (optional) - Results per page (default: 20)
- `offset` (optional) - Pagination offset

**Request Example:**
```http
GET /api/groups/discover?category=electronics&has_slots=true
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "groups": [
    {
      "id": "uuid-3",
      "name": "Smartphone Bulk Buyers",
      "description": "Buying latest smartphones in bulk",
      "avatar": "📱",
      "category": "electronics",
      "privacy": "public",
      "member_count": 8,
      "max_members": 15,
      "available_slots": 7,
      "active_orders": 1,
      "total_savings": 1200.50,
      "created_at": "2025-01-20T10:00:00Z",
      "is_member": false,
      "has_pending_request": false
    }
  ],
  "total": 15,
  "limit": 20,
  "offset": 0
}
```

**Business Logic:**
- Only show public groups
- Exclude groups user is already in
- Show available slots (max_members - member_count)
- Indicate if user has pending join request
- Sort by relevance (recent activity, savings, member count)

**Filters:**
- Category matching
- Location proximity (if implemented)
- Available slots only
- Active groups only

---

### 11. GET /api/groups/search

**Purpose:** Search for groups by name or criteria

**Authentication:** Required

**Query Parameters:**
- `q` (required) - Search query
- `privacy` (optional) - `public` or `private`
- `limit` (optional) - Results per page
- `offset` (optional) - Pagination offset

**Request Example:**
```http
GET /api/groups/search?q=office&privacy=public
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "results": [
    {
      "id": "uuid-2",
      "name": "Office Supplies Group",
      "description": "Monthly office supplies bulk purchase",
      "avatar": "📎",
      "privacy": "public",
      "member_count": 5,
      "max_members": 10,
      "match_score": 0.95,
      "is_member": false
    }
  ],
  "total": 3,
  "query": "office"
}
```

**Business Logic:**
- Search in group name and description
- Rank by relevance (match_score)
- Show public groups always
- Show private groups only if user is member
- Highlight matching text (optional)

---

### 12. GET /api/groups/:id/products

**Purpose:** Get products the group is interested in or actively purchasing

**Authentication:** Required (Member)

**URL Parameters:**
- `id` - Group UUID

**Query Parameters:**
- `status` (optional) - `wishlist`, `negotiating`, `ordered`

**Request Example:**
```http
GET /api/groups/uuid-1/products?status=wishlist
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "products": [
    {
      "id": "uuid-product-1",
      "name": "Wireless Mouse Bulk Pack",
      "image": "https://...",
      "vendor_id": "uuid-vendor-1",
      "vendor_name": "Tech Supplies Co",
      "bulk_price": 15.99,
      "regular_price": 25.99,
      "minimum_quantity": 20,
      "status": "wishlist",
      "interested_members": 8,
      "total_quantity_wanted": 35,
      "added_by": "uuid-user-1",
      "added_at": "2025-01-20T10:00:00Z"
    }
  ],
  "total": 5
}
```

**Business Logic:**
- Show products group members are interested in
- Calculate total demand (interested_members × quantity)
- Show if minimum order quantity is met
- Track which members want each product
- Show negotiation status with vendor

**Product Statuses:**
- `wishlist` - Considering purchasing
- `negotiating` - Admin negotiating with vendor
- `ordered` - Order placed
- `completed` - Delivered

---

### 13. POST /api/groups/:id/products

**Purpose:** Add a product to group's wishlist

**Authentication:** Required (Member)

**URL Parameters:**
- `id` - Group UUID

**Request Body:**
```json
{
  "product_id": "uuid-product-5",
  "quantity": 5,
  "notes": "We need these for office setup"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "product_id": "uuid-product-5",
  "group_id": "uuid-1",
  "quantity": 5,
  "added_by": "uuid-current-user",
  "added_at": "2025-01-26T16:30:00Z",
  "total_group_interest": 15
}
```

**Business Logic:**
- Add product to group_products table
- Track which member added it
- Calculate total group interest
- Notify other members (optional)
- Check if minimum quantity reached
- If MOQ reached, suggest admin to negotiate

**Validation:**
- Product exists and is active
- User is group member
- Product not already in group's list (or update quantity)

---

### 14. DELETE /api/groups/:id/products/:productId

**Purpose:** Remove product from group's wishlist

**Authentication:** Required (Member who added it, or Admin)

**URL Parameters:**
- `id` - Group UUID
- `productId` - Product UUID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Product removed from group wishlist"
}
```

**Business Logic:**
- Only the member who added it or admins can remove
- If product has active negotiations, require admin confirmation
- Notify members who expressed interest

---

### 15. GET /api/groups/:id/orders

**Purpose:** Get all orders for this group

**Authentication:** Required (Member)

**URL Parameters:**
- `id` - Group UUID

**Query Parameters:**
- `status` (optional) - Filter by order status
- `limit` (optional)
- `offset` (optional)

**Response (200 OK):**
```json
{
  "orders": [
    {
      "id": "uuid-order-1",
      "group_id": "uuid-1",
      "product_id": "uuid-product-1",
      "product_name": "Wireless Mouse Bulk Pack",
      "vendor_id": "uuid-vendor-1",
      "vendor_name": "Tech Supplies Co",
      "status": "pending",
      "total_quantity": 25,
      "price_per_unit": 15.99,
      "total_amount": 399.75,
      "participants_count": 8,
      "created_by": "uuid-user-1",
      "created_at": "2025-01-25T14:00:00Z",
      "expected_delivery": "2025-02-10T00:00:00Z",
      "escrow_status": "funded",
      "user_participation": {
        "quantity": 5,
        "amount": 79.95,
        "status": "confirmed"
      }
    }
  ],
  "total": 12,
  "active": 2,
  "completed": 10
}
```

**Business Logic:**
- Show all group orders
- Include user's participation in each order
- Show escrow status
- Calculate savings per order
- Show delivery status

**Order Statuses:**
- `pending` - Awaiting participant confirmations
- `confirmed` - All participants confirmed
- `paid` - Funds in escrow
- `processing` - Vendor preparing order
- `shipped` - On the way
- `delivered` - Completed
- `cancelled` - Cancelled

---

### 16. GET /api/groups/:id/orders/:orderId

**Purpose:** Get detailed information about a specific group order

**Authentication:** Required (Member)

**Response (200 OK):**
```json
{
  "id": "uuid-order-1",
  "group_id": "uuid-1",
  "group_name": "Tech Enthusiasts",
  "product": {
    "id": "uuid-product-1",
    "name": "Wireless Mouse Bulk Pack",
    "image": "https://...",
    "description": "High quality wireless mouse"
  },
  "vendor": {
    "id": "uuid-vendor-1",
    "name": "Tech Supplies Co",
    "rating": 4.8,
    "verified": true
  },
  "pricing": {
    "price_per_unit": 15.99,
    "regular_price": 25.99,
    "savings_per_unit": 10.00,
    "total_quantity": 25,
    "total_amount": 399.75,
    "total_savings": 250.00
  },
  "participants": [
    {
      "user_id": "uuid-user-1",
      "name": "John Doe",
      "quantity": 5,
      "amount": 79.95,
      "status": "confirmed",
      "paid_at": "2025-01-25T15:00:00Z"
    }
  ],
  "timeline": [
    {
      "status": "created",
      "timestamp": "2025-01-25T14:00:00Z",
      "actor": "John Doe"
    },
    {
      "status": "confirmed",
      "timestamp": "2025-01-25T16:00:00Z",
      "actor": "System"
    }
  ],
  "escrow": {
    "status": "funded",
    "total_funded": 399.75,
    "release_date": "2025-02-15T00:00:00Z"
  },
  "delivery": {
    "expected_date": "2025-02-10T00:00:00Z",
    "tracking_number": "TRACK123456",
    "status": "processing"
  }
}
```

**Business Logic:**
- Show complete order details
- List all participants and their contributions
- Show timeline of order events
- Display escrow status
- Show delivery tracking

---

### 17. POST /api/groups/:id/orders

**Purpose:** Create a new group order (Admin only)

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "product_id": "uuid-product-1",
  "vendor_id": "uuid-vendor-1",
  "price_per_unit": 15.99,
  "minimum_quantity": 20,
  "deadline": "2025-02-01T23:59:59Z",
  "delivery_date": "2025-02-15T00:00:00Z",
  "notes": "Negotiated 40% discount for 20+ units"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid-order-new",
  "group_id": "uuid-1",
  "product_id": "uuid-product-1",
  "status": "pending",
  "created_at": "2025-01-26T17:00:00Z",
  "deadline": "2025-02-01T23:59:59Z",
  "participants_needed": 20,
  "message": "Order created. Members can now join this order."
}
```

**Business Logic:**
- Only admins can create orders
- Notify all group members of new order opportunity
- Set deadline for members to join
- Create escrow transaction placeholder
- Track minimum quantity requirement

---

### 18. PUT /api/groups/:id/orders/:orderId

**Purpose:** Update order status (Admin or System)

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "status": "confirmed",
  "tracking_number": "TRACK123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "order_id": "uuid-order-1",
  "new_status": "confirmed",
  "updated_at": "2025-01-26T17:30:00Z"
}
```

**Business Logic:**
- Update order status through workflow
- Notify participants of status changes
- Trigger escrow actions based on status
- Log status changes in timeline

**Status Transitions:**
```
pending → confirmed → paid → processing → shipped → delivered
         ↓
      cancelled
```

---

### 19. GET /api/groups/:id/statistics

**Purpose:** Get group performance statistics

**Authentication:** Required (Member)

**Response (200 OK):**
```json
{
  "group_id": "uuid-1",
  "period": "all_time",
  "members": {
    "total": 12,
    "active": 10,
    "joined_this_month": 3
  },
  "orders": {
    "total": 25,
    "completed": 20,
    "active": 3,
    "cancelled": 2,
    "success_rate": 80
  },
  "financial": {
    "total_spent": 15000.00,
    "total_saved": 3500.00,
    "average_order_value": 600.00,
    "savings_percentage": 23.33
  },
  "engagement": {
    "messages_sent": 450,
    "active_discussions": 5,
    "average_response_time": 120
  }
}
```

**Business Logic:**
- Calculate aggregated statistics
- Show group health metrics
- Compare to previous periods
- Identify trends

---

### 20. GET /api/groups/:id/savings

**Purpose:** Calculate and breakdown total savings

**Authentication:** Required (Member)

**Response (200 OK):**
```json
{
  "group_id": "uuid-1",
  "total_savings": 3500.00,
  "savings_by_category": [
    {
      "category": "electronics",
      "savings": 2000.00,
      "orders": 8
    },
    {
      "category": "office_supplies",
      "savings": 1500.00,
      "orders": 12
    }
  ],
  "savings_by_member": [
    {
      "user_id": "uuid-user-1",
      "name": "John Doe",
      "total_savings": 850.00,
      "orders_count": 10
    }
  ],
  "savings_trend": [
    {
      "month": "2024-12",
      "savings": 500.00
    },
    {
      "month": "2025-01",
      "savings": 800.00
    }
  ]
}
```

**Business Logic:**
- Calculate savings = (regular_price - bulk_price) × quantity
- Breakdown by category, member, time period
- Show savings trends over time
- Motivate members with clear value

---

### 21. GET /api/groups/:id/activity

**Purpose:** Get group activity feed

**Authentication:** Required (Member)

**Query Parameters:**
- `limit` (optional) - Number of activities (default: 50)
- `offset` (optional)

**Response (200 OK):**
```json
{
  "activities": [
    {
      "id": "uuid-activity-1",
      "type": "order_created",
      "actor_id": "uuid-user-1",
      "actor_name": "John Doe",
      "action": "created a new order",
      "target": "Wireless Mouse Bulk Pack",
      "timestamp": "2025-01-26T17:00:00Z",
      "metadata": {
        "order_id": "uuid-order-1",
        "product_name": "Wireless Mouse Bulk Pack"
      }
    },
    {
      "id": "uuid-activity-2",
      "type": "member_joined",
      "actor_id": "uuid-user-5",
      "actor_name": "Alice Brown",
      "action": "joined the group",
      "timestamp": "2025-01-26T16:30:00Z"
    },
    {
      "id": "uuid-activity-3",
      "type": "message_sent",
      "actor_id": "uuid-user-3",
      "actor_name": "Bob Wilson",
      "action": "sent a message",
      "target": "in vendor negotiation chat",
      "timestamp": "2025-01-26T16:00:00Z"
    }
  ],
  "total": 150
}
```

**Activity Types:**
- `member_joined`, `member_left`, `member_promoted`
- `order_created`, `order_confirmed`, `order_completed`
- `product_added`, `product_removed`
- `message_sent`, `chat_created`
- `group_updated`, `settings_changed`

**Business Logic:**
- Log important group events
- Show chronological feed
- Allow filtering by activity type
- Keep members informed of group happenings

---

## 🔐 Authorization & Permissions

### Role-Based Access:

| Endpoint | Admin | Member | Non-Member |
|----------|-------|--------|------------|
| GET /groups | ✅ | ✅ | ✅ |
| GET /groups/:id | ✅ Full | ✅ Full | ✅ Limited (public only) |
| POST /groups | ✅ | ✅ | ✅ |
| PUT /groups/:id | ✅ | ❌ | ❌ |
| DELETE /groups/:id | ✅ | ❌ | ❌ |
| POST /groups/:id/join | N/A | N/A | ✅ |
| POST /groups/:id/leave | ✅ | ✅ | ❌ |
| POST /groups/:id/invite | ✅ | ✅* | ❌ |
| PUT /groups/:id/members/:userId | ✅ | ❌ | ❌ |
| POST /groups/:id/orders | ✅ | ❌ | ❌ |
| PUT /groups/:id/orders/:orderId | ✅ | ❌ | ❌ |

*Members can invite if group settings allow

---

## 🗄️ Database Tables Involved

### groups
```sql
- id (UUID, PK)
- name (VARCHAR)
- description (TEXT)
- avatar (VARCHAR)
- status (ENUM: active, archived, deleted)
- privacy (ENUM: public, private)
- max_members (INT)
- auto_accept (BOOLEAN)
- category (VARCHAR)
- created_by (UUID, FK → users.id)
- created_at (TIMESTAMP)
```

### group_members
```sql
- id (UUID, PK)
- group_id (UUID, FK → groups.id)
- user_id (UUID, FK → users.id)
- role (ENUM: admin, member)
- joined_at (TIMESTAMP)
```

### group_products (wishlist)
```sql
- id (UUID, PK)
- group_id (UUID, FK → groups.id)
- product_id (UUID, FK → products.id)
- added_by (UUID, FK → users.id)
- status (ENUM: wishlist, negotiating, ordered)
- quantity (INT)
- added_at (TIMESTAMP)
```

### group_orders
```sql
- id (UUID, PK)
- group_id (UUID, FK → groups.id)
- product_id (UUID, FK → products.id)
- vendor_id (UUID, FK → users.id)
- status (ENUM: pending, confirmed, paid, etc.)
- price_per_unit (DECIMAL)
- total_quantity (INT)
- created_by (UUID, FK → users.id)
- deadline (TIMESTAMP)
- created_at (TIMESTAMP)
```

### group_order_participants
```sql
- id (UUID, PK)
- order_id (UUID, FK → group_orders.id)
- user_id (UUID, FK → users.id)
- quantity (INT)
- amount (DECIMAL)
- status (ENUM: pending, confirmed, paid)
- joined_at (TIMESTAMP)
```

---

## 🔄 Integration Points

### With Chat System:
- Auto-create internal chat when group is created
- Auto-add members to internal chat when they join
- Create vendor chat when negotiating with vendors

### With Escrow System:
- Create escrow transactions for group orders
- Lock funds when order is confirmed
- Release funds when order is delivered

### With User System:
- Verify user authentication for all endpoints
- Track user roles and permissions
- Send notifications to users

### With Vendor System:
- Link orders to vendors
- Track vendor performance per group
- Enable group-vendor negotiations

### With Product System:
- Link group wishlist to product catalog
- Show bulk pricing based on group size
- Calculate if MOQ is met

---

## 🎯 Business Rules Summary

1. **Group Creation:**
   - Any authenticated user can create a group
   - Creator becomes first admin automatically
   - Internal chat created automatically

2. **Membership:**
   - Public groups: Anyone can join (if auto_accept)
   - Private groups: Require admin approval
   - Groups have max_members limit

3. **Roles:**
   - Admin: Full control (edit, delete, invite, create orders)
   - Member: Limited control (view, participate in orders)
   - At least one admin must exist at all times

4. **Orders:**
   - Only admins can create group orders
   - Members opt-in to participate
   - Requires minimum quantity to activate
   - Funds held in escrow until delivery

5. **Privacy:**
   - Public groups: Visible in discovery, anyone can join
   - Private groups: Invite-only, not in public discovery

6. **Deletion:**
   - Soft delete preferred (preserve history)
   - Cannot delete with active orders
   - Must resolve escrow transactions first

---

## 🎉 Summary

The **Group Routes** manage the entire lifecycle of purchasing groups from creation to order fulfillment. They enable:

- **Discovery** - Find groups to join
- **Management** - Create, update, delete groups
- **Membership** - Join, leave, invite, manage roles
- **Collaboration** - Add products, create orders, track activity
- **Analytics** - View statistics, savings, performance

All endpoints work together with Chat, Escrow, User, Vendor, and Product systems to create a seamless bulk purchasing experience! 🚀
