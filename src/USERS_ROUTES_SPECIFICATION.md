# 👤 Users Routes Specification

## Overview

The **Users Routes** manage user profiles, preferences, relationships, and account operations for the "Save Together, Buy Smarter" bulk purchasing application beyond authentication (which is handled by Auth Routes).

---

## 🎯 What Users Routes Are For

In your bulk purchasing app, **Users** enable:

1. **Profile Management** - View and update user profiles
2. **User Discovery** - Find and connect with other users
3. **Relationships** - Follow users, friendships
4. **Activity Tracking** - User actions and history
5. **Preferences** - User settings and notifications
6. **Wallet Management** - User balance and transactions
7. **Reputation System** - Ratings and trust scores

---

## 🏗️ Users Architecture

### Base Route
```
/api/users
```

### Authentication
- **Public Endpoints:** View public profiles
- **Authenticated:** View full profiles, manage own profile
- **Admin:** Manage all users

---

## 📍 Complete Endpoint List

### User Profiles (5 endpoints)
1. `GET /api/users` - List/search users
2. `GET /api/users/:id` - Get user profile
3. `GET /api/users/me` - Get own profile (alias for /api/auth/me)
4. `PUT /api/users/me` - Update own profile
5. `GET /api/users/:id/activity` - Get user activity feed

### User Relationships (6 endpoints)
6. `GET /api/users/:id/followers` - Get user's followers
7. `GET /api/users/:id/following` - Get users they follow
8. `POST /api/users/:id/follow` - Follow a user
9. `DELETE /api/users/:id/unfollow` - Unfollow a user
10. `GET /api/users/me/connections` - Get connections
11. `GET /api/users/suggestions` - Get user suggestions

### User Wallet (5 endpoints)
12. `GET /api/users/me/wallet` - Get wallet details
13. `GET /api/users/me/wallet/transactions` - Get wallet transactions
14. `POST /api/users/me/wallet/deposit` - Add funds to wallet
15. `POST /api/users/me/wallet/withdraw` - Withdraw funds
16. `GET /api/users/me/wallet/balance` - Get current balance

### User Preferences (4 endpoints)
17. `GET /api/users/me/preferences` - Get user preferences
18. `PUT /api/users/me/preferences` - Update preferences
19. `GET /api/users/me/notifications` - Get notifications
20. `PUT /api/users/me/notifications/:id/read` - Mark notification as read

### User Statistics (3 endpoints)
21. `GET /api/users/:id/statistics` - Get user statistics
22. `GET /api/users/me/savings` - Get total savings
23. `GET /api/users/me/reputation` - Get reputation score

### Admin - User Management (5 endpoints)
24. `GET /api/users/admin/all` - Get all users (Admin)
25. `PUT /api/users/:id/suspend` - Suspend user (Admin)
26. `PUT /api/users/:id/activate` - Activate user (Admin)
27. `PUT /api/users/:id/role` - Change user role (Admin)
28. `DELETE /api/users/:id` - Delete user (Admin)

---

## 📖 Detailed Endpoint Specifications

---

### 1. GET /api/users

**Purpose:** List and search users

**Authentication:** Not required (public profiles only)

**Query Parameters:**
- `q` (optional) - Search query (name, email)
- `role` (optional) - Filter by role: `member`, `vendor`
- `location` (optional) - Filter by location
- `verified` (optional, boolean) - Only verified users
- `min_reputation` (optional) - Minimum reputation score
- `sort_by` (optional) - `name`, `reputation`, `activity`, `joined_date`
- `order` (optional) - `asc`, `desc`
- `limit` (optional) - Results per page (default: 20)
- `offset` (optional) - Pagination offset

**Request Example:**
```http
GET /api/users?q=john&role=member&min_reputation=4&sort_by=reputation
```

**Response (200 OK):**
```json
{
  "users": [
    {
      "id": "uuid-user-1",
      "name": "John Doe",
      "avatar": "https://example.com/avatar-1.jpg",
      "role": "member",
      "location": "San Francisco, CA",
      "bio": "Tech enthusiast and bulk buying pro",
      
      "reputation": {
        "score": 4.8,
        "level": "trusted",
        "badges": ["verified", "top_buyer", "community_helper"]
      },
      
      "statistics": {
        "groups_count": 5,
        "orders_count": 25,
        "total_saved": 1500.00,
        "member_since": "2024-06-15T00:00:00Z"
      },
      
      "verified": true,
      "is_following": false,
      "is_follower": false
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "has_next": true
  }
}
```

**Business Logic:**
- Search by name or location
- Filter by role and reputation
- Show only public profile data
- Indicate relationship (following/follower)

---

### 2. GET /api/users/:id

**Purpose:** Get detailed user profile

**Authentication:** Not required for public data (more details if authenticated)

**URL Parameters:**
- `id` - User UUID or username

**Query Parameters:**
- `include` (optional) - `groups,orders,reviews,statistics`

**Request Example:**
```http
GET /api/users/uuid-user-1?include=groups,statistics
```

**Response (200 OK):**
```json
{
  "id": "uuid-user-1",
  "name": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "avatar": "https://example.com/avatar-1.jpg",
  "banner": "https://example.com/banner-1.jpg",
  "role": "member",
  
  "bio": "Tech enthusiast and bulk buying pro. Love finding great deals on quality products.",
  
  "location": {
    "city": "San Francisco",
    "state": "CA",
    "country": "USA"
  },
  
  "contact": {
    "email_public": true,
    "phone_public": false,
    "website": "https://johndoe.com"
  },
  
  "reputation": {
    "score": 4.8,
    "level": "trusted",
    "total_reviews": 50,
    "positive_reviews": 48,
    "neutral_reviews": 2,
    "negative_reviews": 0,
    "badges": [
      {
        "id": "verified",
        "name": "Verified Member",
        "icon": "✓",
        "earned_at": "2024-07-01T00:00:00Z"
      },
      {
        "id": "top_buyer",
        "name": "Top Buyer",
        "icon": "🏆",
        "earned_at": "2024-12-01T00:00:00Z"
      }
    ]
  },
  
  "statistics": {
    "member_since": "2024-06-15T00:00:00Z",
    "groups_count": 5,
    "groups_admin": 2,
    "orders_count": 25,
    "completed_orders": 23,
    "total_spent": 5000.00,
    "total_saved": 1500.00,
    "savings_percentage": 30.0,
    "followers_count": 45,
    "following_count": 32,
    "reviews_given": 20,
    "reviews_received": 15
  },
  
  "groups": [
    {
      "id": "uuid-group-1",
      "name": "Tech Enthusiasts",
      "avatar": "🖥️",
      "role": "admin",
      "member_count": 12
    }
  ],
  
  "recent_activity": [
    {
      "type": "order_completed",
      "description": "Completed order for Wireless Mouse",
      "timestamp": "2025-01-25T14:00:00Z"
    },
    {
      "type": "group_joined",
      "description": "Joined Office Supplies Group",
      "timestamp": "2025-01-20T10:00:00Z"
    }
  ],
  
  "social": {
    "is_following": false,
    "is_follower": false,
    "mutual_groups": 2,
    "mutual_followers": 5
  },
  
  "preferences": {
    "show_email": true,
    "show_phone": false,
    "show_location": true,
    "show_activity": true
  },
  
  "verified": true,
  "email_verified": true,
  "status": "active",
  "last_active": "2025-01-26T10:00:00Z"
}
```

**Business Logic:**
- Show public profile data to everyone
- Show extended data if authenticated
- Show private data only to user themselves
- Calculate reputation and statistics
- Check relationship status

---

### 4. PUT /api/users/me

**Purpose:** Update own user profile

**Authentication:** Required

**Request Body (all fields optional):**
```json
{
  "name": "John Updated Doe",
  "username": "johnupdated",
  "bio": "Updated bio",
  "avatar": "https://new-avatar.jpg",
  "banner": "https://new-banner.jpg",
  "location": {
    "city": "Los Angeles",
    "state": "CA",
    "country": "USA"
  },
  "contact": {
    "email_public": false,
    "phone_public": false,
    "website": "https://newwebsite.com"
  },
  "social_links": {
    "twitter": "@johndoe",
    "linkedin": "johndoe"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    // updated user details
    "updated_at": "2025-01-26T15:00:00Z"
  }
}
```

**Business Logic:**
- Validate username is unique
- Validate avatar/banner URLs
- Sanitize all inputs
- Update only provided fields
- Log profile changes

---

### 5. GET /api/users/:id/activity

**Purpose:** Get user's activity feed

**Authentication:** Optional (more details if authenticated)

**Query Parameters:**
- `type` (optional) - Filter by activity type
- `limit` (optional) - Results per page (default: 20)
- `offset` (optional)

**Activity Types:**
- `order_created`
- `order_completed`
- `group_joined`
- `group_created`
- `review_posted`
- `product_added_to_wishlist`
- `user_followed`

**Response (200 OK):**
```json
{
  "user_id": "uuid-user-1",
  "activities": [
    {
      "id": "uuid-activity-1",
      "type": "order_completed",
      "title": "Completed an order",
      "description": "Successfully received Wireless Mouse Bulk Pack",
      "entity": {
        "type": "order",
        "id": "uuid-order-1",
        "name": "Wireless Mouse Bulk Pack",
        "image": "https://..."
      },
      "savings": 50.00,
      "timestamp": "2025-01-25T14:00:00Z"
    },
    {
      "id": "uuid-activity-2",
      "type": "group_joined",
      "title": "Joined a group",
      "description": "Joined Office Supplies Group",
      "entity": {
        "type": "group",
        "id": "uuid-group-2",
        "name": "Office Supplies Group",
        "avatar": "📎"
      },
      "timestamp": "2025-01-20T10:00:00Z"
    },
    {
      "id": "uuid-activity-3",
      "type": "review_posted",
      "title": "Posted a review",
      "description": "Reviewed Tech Supplies Co",
      "entity": {
        "type": "vendor",
        "id": "uuid-vendor-1",
        "name": "Tech Supplies Co"
      },
      "rating": 5,
      "timestamp": "2025-01-21T16:00:00Z"
    }
  ],
  "pagination": {
    "total": 50,
    "limit": 20,
    "offset": 0
  }
}
```

---

### 6. GET /api/users/:id/followers

**Purpose:** Get list of users following this user

**Authentication:** Optional

**Response (200 OK):**
```json
{
  "user_id": "uuid-user-1",
  "followers": [
    {
      "id": "uuid-user-2",
      "name": "Jane Smith",
      "avatar": "https://...",
      "role": "member",
      "reputation_score": 4.6,
      "followed_at": "2025-01-15T00:00:00Z",
      "is_following_back": true,
      "mutual_groups": 2
    }
  ],
  "total": 45
}
```

---

### 8. POST /api/users/:id/follow

**Purpose:** Follow a user

**Authentication:** Required

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Now following John Doe",
  "user_id": "uuid-user-1",
  "followed_at": "2025-01-26T16:00:00Z",
  "is_mutual": false
}
```

**Business Logic:**
- Create follower relationship
- Notify user of new follower
- Check if mutual follow
- Update follower counts

---

### 12. GET /api/users/me/wallet

**Purpose:** Get user's wallet details

**Authentication:** Required

**Response (200 OK):**
```json
{
  "wallet_id": "uuid-wallet-1",
  "user_id": "uuid-user-1",
  
  "balance": {
    "available": 150.50,
    "pending": 50.00,
    "reserved": 20.00,
    "total": 220.50,
    "currency": "USD"
  },
  
  "breakdown": {
    "deposits": 500.00,
    "withdrawals": 200.00,
    "spent_on_orders": 100.00,
    "refunds_received": 20.50,
    "earnings": 0.00
  },
  
  "limits": {
    "daily_withdrawal": 1000.00,
    "monthly_withdrawal": 10000.00,
    "remaining_today": 1000.00,
    "remaining_this_month": 9800.00
  },
  
  "linked_accounts": [
    {
      "type": "bank_account",
      "bank_name": "Chase Bank",
      "last_4": "1234",
      "is_primary": true
    }
  ],
  
  "pending_transactions": [
    {
      "type": "deposit",
      "amount": 50.00,
      "status": "processing",
      "expected_clear": "2025-01-28T00:00:00Z"
    }
  ]
}
```

**Business Logic:**
- Show current balances
- Track pending amounts
- Show transaction limits
- List linked payment methods

---

### 13. GET /api/users/me/wallet/transactions

**Purpose:** Get wallet transaction history

**Authentication:** Required

**Query Parameters:**
- `type` (optional) - `deposit`, `withdrawal`, `order`, `refund`, `transfer`
- `status` (optional) - `completed`, `pending`, `failed`
- `date_from` (optional)
- `date_to` (optional)
- `limit` (optional)
- `offset` (optional)

**Response (200 OK):**
```json
{
  "transactions": [
    {
      "id": "uuid-txn-1",
      "type": "deposit",
      "amount": 100.00,
      "currency": "USD",
      "status": "completed",
      "description": "Wallet deposit via Visa ending in 4242",
      "payment_method": {
        "type": "credit_card",
        "last_4": "4242"
      },
      "balance_after": 250.50,
      "fee": 3.00,
      "created_at": "2025-01-20T10:00:00Z",
      "completed_at": "2025-01-20T10:05:00Z"
    },
    {
      "id": "uuid-txn-2",
      "type": "order",
      "amount": -92.59,
      "currency": "USD",
      "status": "completed",
      "description": "Payment for Order #ORD-2025-001234",
      "order_id": "uuid-order-1",
      "balance_after": 157.91,
      "created_at": "2025-01-25T17:00:00Z"
    },
    {
      "id": "uuid-txn-3",
      "type": "refund",
      "amount": 50.00,
      "currency": "USD",
      "status": "completed",
      "description": "Refund for cancelled order",
      "order_id": "uuid-order-5",
      "balance_after": 207.91,
      "created_at": "2025-01-26T09:00:00Z"
    }
  ],
  "summary": {
    "total_in": 500.00,
    "total_out": 300.00,
    "net": 200.00
  },
  "pagination": {
    "total": 50,
    "limit": 20,
    "offset": 0
  }
}
```

---

### 14. POST /api/users/me/wallet/deposit

**Purpose:** Add funds to wallet

**Authentication:** Required

**Request Body:**
```json
{
  "amount": 100.00,
  "payment_method_id": "uuid-pm-1",
  "save_payment_method": true
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Funds added to wallet",
  "transaction": {
    "id": "uuid-txn-new",
    "amount": 100.00,
    "fee": 3.00,
    "net_amount": 97.00,
    "status": "processing",
    "expected_clear": "2025-01-28T00:00:00Z"
  },
  "new_balance": {
    "available": 250.50,
    "pending": 97.00
  }
}
```

**Business Logic:**
- Charge payment method
- Apply processing fee (3%)
- Add to pending balance
- Clear after 2-3 business days
- Update balance when cleared

---

### 15. POST /api/users/me/wallet/withdraw

**Purpose:** Withdraw funds from wallet

**Authentication:** Required

**Request Body:**
```json
{
  "amount": 150.00,
  "destination": "bank_account",
  "bank_account_id": "uuid-bank-1"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Withdrawal initiated",
  "withdrawal": {
    "id": "uuid-withdrawal-1",
    "amount": 150.00,
    "fee": 1.00,
    "net_amount": 149.00,
    "status": "processing",
    "destination": "Chase Bank ...1234",
    "estimated_arrival": "2025-01-29T00:00:00Z"
  },
  "new_balance": {
    "available": 0.50,
    "pending": 50.00
  }
}
```

**Business Logic:**
- Verify sufficient available balance
- Check daily/monthly limits
- Deduct from available balance
- Apply withdrawal fee ($1.00)
- Process to bank account (3-5 days)

---

### 17. GET /api/users/me/preferences

**Purpose:** Get user preferences and settings

**Authentication:** Required

**Response (200 OK):**
```json
{
  "notifications": {
    "email_enabled": true,
    "push_enabled": true,
    "sms_enabled": false,
    
    "order_updates": true,
    "group_invitations": true,
    "group_messages": true,
    "vendor_messages": true,
    "price_drops": true,
    "new_products": false,
    "weekly_digest": true,
    
    "marketing_emails": false
  },
  
  "privacy": {
    "show_email": false,
    "show_phone": false,
    "show_location": true,
    "show_activity": true,
    "show_groups": true,
    "show_orders": false,
    "allow_messages": true,
    "allow_group_invites": true
  },
  
  "display": {
    "theme": "light",
    "language": "en",
    "currency": "USD",
    "timezone": "America/Los_Angeles",
    "date_format": "MM/DD/YYYY"
  },
  
  "shopping": {
    "default_shipping_address": "uuid-address-1",
    "default_payment_method": "uuid-pm-1",
    "save_payment_methods": true,
    "auto_join_group_orders": false
  }
}
```

---

### 18. PUT /api/users/me/preferences

**Purpose:** Update user preferences

**Authentication:** Required

**Request Body (all fields optional):**
```json
{
  "notifications": {
    "email_enabled": false,
    "order_updates": true,
    "price_drops": true
  },
  "privacy": {
    "show_email": false,
    "show_location": true
  },
  "display": {
    "theme": "dark",
    "language": "en"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Preferences updated",
  "preferences": {
    // updated preferences
  }
}
```

---

### 19. GET /api/users/me/notifications

**Purpose:** Get user notifications

**Authentication:** Required

**Query Parameters:**
- `type` (optional) - Filter by type
- `read` (optional, boolean) - Filter by read status
- `limit` (optional)
- `offset` (optional)

**Response (200 OK):**
```json
{
  "notifications": [
    {
      "id": "uuid-notif-1",
      "type": "order_shipped",
      "title": "Order Shipped",
      "message": "Your order #ORD-2025-001234 has been shipped",
      "data": {
        "order_id": "uuid-order-1",
        "tracking_number": "TRACK123456"
      },
      "action_url": "/orders/uuid-order-1",
      "read": false,
      "created_at": "2025-01-28T10:00:00Z"
    },
    {
      "id": "uuid-notif-2",
      "type": "group_invitation",
      "title": "Group Invitation",
      "message": "John Doe invited you to join Tech Enthusiasts",
      "data": {
        "group_id": "uuid-group-1",
        "inviter_id": "uuid-user-1"
      },
      "action_url": "/groups/uuid-group-1",
      "read": true,
      "created_at": "2025-01-25T15:00:00Z",
      "read_at": "2025-01-25T16:00:00Z"
    }
  ],
  "unread_count": 5,
  "total": 50
}
```

**Notification Types:**
- `order_created`
- `order_shipped`
- `order_delivered`
- `group_invitation`
- `group_order_created`
- `message_received`
- `review_received`
- `price_drop`
- `product_back_in_stock`

---

### 21. GET /api/users/:id/statistics

**Purpose:** Get comprehensive user statistics

**Authentication:** Optional (public stats vs private stats)

**Response (200 OK):**
```json
{
  "user_id": "uuid-user-1",
  
  "membership": {
    "member_since": "2024-06-15T00:00:00Z",
    "account_age_days": 225,
    "status": "active",
    "verified": true
  },
  
  "groups": {
    "total": 5,
    "as_admin": 2,
    "as_member": 3,
    "total_members_reached": 50
  },
  
  "orders": {
    "total": 25,
    "completed": 23,
    "cancelled": 2,
    "average_order_value": 200.00,
    "total_spent": 5000.00,
    "total_items": 150
  },
  
  "savings": {
    "total_saved": 1500.00,
    "average_savings_per_order": 60.00,
    "savings_percentage": 30.0,
    "best_deal": {
      "order_id": "uuid-order-5",
      "product": "Office Chair",
      "savings": 200.00,
      "savings_percentage": 45.0
    }
  },
  
  "reputation": {
    "score": 4.8,
    "level": "trusted",
    "total_reviews": 50,
    "positive": 48,
    "neutral": 2,
    "negative": 0
  },
  
  "social": {
    "followers": 45,
    "following": 32,
    "groups_created": 2,
    "reviews_posted": 20
  },
  
  "activity": {
    "last_order": "2025-01-25T14:00:00Z",
    "last_active": "2025-01-26T10:00:00Z",
    "orders_this_month": 3,
    "active_groups": 4
  }
}
```

---

### 22. GET /api/users/me/savings

**Purpose:** Get detailed savings breakdown

**Authentication:** Required

**Query Parameters:**
- `period` (optional) - `week`, `month`, `year`, `all_time`

**Response (200 OK):**
```json
{
  "period": "all_time",
  
  "total_savings": 1500.00,
  "total_spent": 5000.00,
  "could_have_spent": 6500.00,
  "savings_percentage": 23.08,
  
  "by_category": [
    {
      "category": "Electronics",
      "savings": 800.00,
      "orders": 10,
      "percentage": 53.3
    },
    {
      "category": "Office Supplies",
      "savings": 700.00,
      "orders": 15,
      "percentage": 46.7
    }
  ],
  
  "by_month": [
    {
      "month": "2025-01",
      "savings": 250.00,
      "orders": 3
    },
    {
      "month": "2024-12",
      "savings": 300.00,
      "orders": 4
    }
  ],
  
  "top_deals": [
    {
      "order_id": "uuid-order-5",
      "product": "Office Chair Bulk Pack",
      "retail_price": 120.00,
      "paid_price": 75.00,
      "savings": 45.00,
      "savings_percentage": 37.5,
      "date": "2024-12-15T00:00:00Z"
    }
  ],
  
  "comparison": {
    "vs_average_user": 25.5,
    "rank": "Top 15%"
  }
}
```

---

### 23. GET /api/users/me/reputation

**Purpose:** Get detailed reputation breakdown

**Authentication:** Required

**Response (200 OK):**
```json
{
  "score": 4.8,
  "level": "trusted",
  "level_progress": {
    "current_level": "trusted",
    "next_level": "expert",
    "progress_percentage": 75.0,
    "points_needed": 50
  },
  
  "points": {
    "total": 750,
    "breakdown": {
      "orders_completed": 230,
      "reviews_received": 250,
      "groups_created": 50,
      "helping_others": 120,
      "positive_reviews": 100
    }
  },
  
  "reviews": {
    "total": 50,
    "positive": 48,
    "neutral": 2,
    "negative": 0,
    "average_rating": 4.9
  },
  
  "badges": [
    {
      "id": "verified",
      "name": "Verified Member",
      "description": "Email and identity verified",
      "icon": "✓",
      "rarity": "common",
      "earned_at": "2024-07-01T00:00:00Z"
    },
    {
      "id": "top_buyer",
      "name": "Top Buyer",
      "description": "Completed 20+ orders",
      "icon": "🏆",
      "rarity": "rare",
      "earned_at": "2024-12-01T00:00:00Z"
    },
    {
      "id": "community_helper",
      "name": "Community Helper",
      "description": "Helped 10+ users find deals",
      "icon": "🤝",
      "rarity": "epic",
      "earned_at": "2025-01-15T00:00:00Z"
    }
  ],
  
  "achievements": {
    "completed": 15,
    "in_progress": 5,
    "locked": 20
  },
  
  "trust_indicators": {
    "email_verified": true,
    "phone_verified": true,
    "identity_verified": false,
    "payment_verified": true,
    "address_verified": true
  }
}
```

**Reputation Levels:**
- `new` (0-99 points)
- `active` (100-249 points)
- `trusted` (250-499 points)
- `expert` (500-999 points)
- `master` (1000+ points)

**Earning Points:**
- Complete order: +10 points
- Receive 5-star review: +5 points
- Create group: +25 points
- First group order success: +50 points
- Help another user: +10 points
- Post helpful review: +5 points

---

### 24. GET /api/users/admin/all (Admin Only)

**Purpose:** Get all users with admin filters

**Authentication:** Required (Admin role)

**Query Parameters:**
- `status` (optional) - `active`, `suspended`, `deleted`
- `role` (optional) - `member`, `vendor`, `admin`
- `verified` (optional, boolean)
- `date_from` (optional) - Registration date filter
- `sort_by` (optional)
- `limit`, `offset`

**Response (200 OK):**
```json
{
  "users": [
    {
      "id": "uuid-user-1",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "member",
      "status": "active",
      "verified": true,
      "email_verified": true,
      
      "statistics": {
        "orders_count": 25,
        "groups_count": 5,
        "total_spent": 5000.00
      },
      
      "reputation_score": 4.8,
      
      "flags": {
        "suspicious_activity": false,
        "payment_issues": false,
        "reported_count": 0
      },
      
      "created_at": "2024-06-15T00:00:00Z",
      "last_active": "2025-01-26T10:00:00Z"
    }
  ],
  "summary": {
    "total_users": 10000,
    "active_users": 9500,
    "suspended_users": 50,
    "new_this_month": 150
  },
  "pagination": {
    "total": 10000,
    "limit": 50,
    "offset": 0
  }
}
```

---

### 25. PUT /api/users/:id/suspend (Admin Only)

**Purpose:** Suspend a user account

**Authentication:** Required (Admin role)

**Request Body:**
```json
{
  "reason": "Violating community guidelines",
  "duration": 30,
  "note": "Multiple reports of spam behavior"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User suspended",
  "user": {
    "id": "uuid-user-1",
    "status": "suspended",
    "suspended_until": "2025-02-25T00:00:00Z",
    "suspended_at": "2025-01-26T16:00:00Z"
  }
}
```

---

## 🗄️ Database Tables

### users
*(Already defined in Auth Routes, repeated here for reference)*

### user_followers
```sql
CREATE TABLE user_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(follower_id, following_id)
);

CREATE INDEX idx_followers_follower ON user_followers(follower_id);
CREATE INDEX idx_followers_following ON user_followers(following_id);
```

### user_wallets
```sql
CREATE TABLE user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id),
  
  balance_available DECIMAL(10,2) DEFAULT 0,
  balance_pending DECIMAL(10,2) DEFAULT 0,
  balance_reserved DECIMAL(10,2) DEFAULT 0,
  
  currency VARCHAR(3) DEFAULT 'USD',
  
  lifetime_deposits DECIMAL(10,2) DEFAULT 0,
  lifetime_withdrawals DECIMAL(10,2) DEFAULT 0,
  lifetime_spent DECIMAL(10,2) DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### wallet_transactions
```sql
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES user_wallets(id),
  user_id UUID NOT NULL REFERENCES users(id),
  
  type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'order', 'refund', 'transfer', 'fee')),
  amount DECIMAL(10,2) NOT NULL,
  fee DECIMAL(10,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  
  description TEXT,
  
  order_id UUID REFERENCES orders(id),
  payment_method_id UUID,
  external_transaction_id VARCHAR(100),
  
  balance_before DECIMAL(10,2),
  balance_after DECIMAL(10,2),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_wallet_txn_wallet ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_txn_user ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_txn_type ON wallet_transactions(type);
CREATE INDEX idx_wallet_txn_status ON wallet_transactions(status);
```

### user_notifications
```sql
CREATE TABLE user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  
  data JSONB,
  action_url VARCHAR(500),
  
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  
  sent_via_email BOOLEAN DEFAULT false,
  sent_via_push BOOLEAN DEFAULT false,
  sent_via_sms BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON user_notifications(user_id);
CREATE INDEX idx_notifications_read ON user_notifications(read);
CREATE INDEX idx_notifications_type ON user_notifications(type);
```

### user_activity
```sql
CREATE TABLE user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200),
  description TEXT,
  
  entity_type VARCHAR(50),
  entity_id UUID,
  
  metadata JSONB,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_user ON user_activity(user_id);
CREATE INDEX idx_activity_type ON user_activity(type);
```

### user_reputation
```sql
CREATE TABLE user_reputation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id),
  
  score DECIMAL(3,2) DEFAULT 0 CHECK (score >= 0 AND score <= 5),
  level VARCHAR(20) DEFAULT 'new',
  points INT DEFAULT 0,
  
  total_reviews INT DEFAULT 0,
  positive_reviews INT DEFAULT 0,
  neutral_reviews INT DEFAULT 0,
  negative_reviews INT DEFAULT 0,
  
  badges TEXT[],
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🎉 Summary

The **Users Routes** provide comprehensive user management with:

- ✅ **Profile Management** - Complete user profiles
- ✅ **Social Features** - Follow, connections
- ✅ **Wallet System** - Balance, deposits, withdrawals
- ✅ **Preferences** - Customizable settings
- ✅ **Notifications** - Real-time updates
- ✅ **Reputation** - Trust and badges system
- ✅ **Statistics** - Activity and savings tracking
- ✅ **Admin Tools** - User management

All endpoints support the complete user experience! 👤
