# 📦 Orders Routes Specification

## Overview

The **Orders Routes** manage the complete order lifecycle in the "Save Together, Buy Smarter" bulk purchasing application, from creation to delivery, including group orders, individual purchases, payment processing, and fulfillment tracking.

---

## 🎯 What Orders Routes Are For

In your bulk purchasing app, **Orders** enable:

1. **Group Orders** - Collective purchasing by group members
2. **Order Tracking** - Monitor order status from creation to delivery
3. **Payment Processing** - Integrate with escrow system
4. **Participant Management** - Track who's in each order
5. **Order Fulfillment** - Vendor processing and shipping
6. **Order History** - Track past purchases and savings
7. **Dispute Management** - Handle issues and refunds

---

## 🏗️ Orders Architecture

### Base Route
```
/api/orders
```

### Authentication
- **All endpoints require authentication**
- Different permissions for buyers, vendors, admins

---

## 📍 Complete Endpoint List

### Order Browsing (4 endpoints)
1. `GET /api/orders` - List user's orders
2. `GET /api/orders/:id` - Get specific order details
3. `GET /api/orders/history` - Get order history with filters
4. `GET /api/orders/summary` - Get order summary/stats

### Order Creation (3 endpoints)
5. `POST /api/orders` - Create new order (individual or group)
6. `POST /api/orders/:id/join` - Join existing group order
7. `POST /api/orders/:id/leave` - Leave group order (before confirmation)

### Order Management (5 endpoints)
8. `PUT /api/orders/:id/confirm` - Confirm participation in order
9. `PUT /api/orders/:id/cancel` - Cancel order
10. `PUT /api/orders/:id/status` - Update order status
11. `PUT /api/orders/:id/shipping` - Update shipping address
12. `POST /api/orders/:id/extend-deadline` - Extend order deadline

### Order Tracking (4 endpoints)
13. `GET /api/orders/:id/tracking` - Get shipping tracking info
14. `GET /api/orders/:id/timeline` - Get order timeline/history
15. `POST /api/orders/:id/received` - Confirm order received
16. `GET /api/orders/:id/participants` - Get order participants

### Order Issues (4 endpoints)
17. `POST /api/orders/:id/issues` - Report an issue
18. `GET /api/orders/:id/issues` - Get order issues
19. `PUT /api/orders/:id/issues/:issueId` - Update issue status
20. `POST /api/orders/:id/refund` - Request refund

### Order Documents (3 endpoints)
21. `GET /api/orders/:id/invoice` - Get order invoice
22. `GET /api/orders/:id/receipt` - Get order receipt
23. `GET /api/orders/:id/documents` - Get all order documents

---

## 📖 Detailed Endpoint Specifications

---

### 1. GET /api/orders

**Purpose:** List all orders for authenticated user

**Authentication:** Required

**Query Parameters:**
- `type` (optional) - `individual`, `group`
- `status` (optional) - `pending`, `confirmed`, `paid`, `processing`, `shipped`, `delivered`, `cancelled`
- `role` (optional) - `buyer`, `participant` (for group orders)
- `date_from` (optional) - Start date
- `date_to` (optional) - End date
- `group_id` (optional) - Filter by group
- `vendor_id` (optional) - Filter by vendor
- `sort_by` (optional) - `date`, `amount`, `status`
- `order` (optional) - `asc`, `desc` (default: `desc`)
- `limit` (optional) - Results per page (default: 20)
- `offset` (optional) - Pagination offset

**Request Example:**
```http
GET /api/orders?status=processing&type=group&sort_by=date&order=desc
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "orders": [
    {
      "id": "uuid-order-1",
      "order_number": "ORD-2025-001234",
      "type": "group",
      
      "product": {
        "id": "uuid-product-1",
        "name": "Wireless Mouse - Bulk Pack of 20",
        "image": "https://example.com/images/mouse.jpg",
        "sku": "WM-BULK-20"
      },
      
      "vendor": {
        "id": "uuid-vendor-1",
        "name": "Tech Supplies Co",
        "logo": "https://...",
        "verified": true
      },
      
      "group": {
        "id": "uuid-group-1",
        "name": "Tech Enthusiasts",
        "admin": {
          "name": "John Doe"
        }
      },
      
      "pricing": {
        "quantity": 5,
        "price_per_unit": 15.99,
        "subtotal": 79.95,
        "shipping": 5.00,
        "tax": 7.20,
        "total": 92.15,
        "savings": 50.00
      },
      
      "total_order": {
        "quantity": 25,
        "total_amount": 399.75,
        "participants_count": 8
      },
      
      "status": "processing",
      "payment_status": "paid",
      "shipping_status": "preparing",
      
      "dates": {
        "created_at": "2025-01-25T14:00:00Z",
        "confirmed_at": "2025-01-25T16:00:00Z",
        "paid_at": "2025-01-25T17:00:00Z",
        "estimated_delivery": "2025-02-10T00:00:00Z",
        "deadline": "2025-02-08T00:00:00Z"
      },
      
      "your_role": "participant",
      "can_cancel": false,
      "can_modify": false
    },
    {
      "id": "uuid-order-2",
      "order_number": "ORD-2025-001235",
      "type": "individual",
      
      "product": {
        "id": "uuid-product-2",
        "name": "Office Chair Bulk Pack",
        "image": "https://...",
        "sku": "OC-BULK-10"
      },
      
      "vendor": {
        "id": "uuid-vendor-2",
        "name": "Office Supplies Inc",
        "verified": false
      },
      
      "group": null,
      
      "pricing": {
        "quantity": 10,
        "price_per_unit": 89.99,
        "subtotal": 899.90,
        "shipping": 50.00,
        "tax": 85.49,
        "total": 1035.39,
        "savings": 200.00
      },
      
      "status": "delivered",
      "payment_status": "paid",
      "shipping_status": "delivered",
      
      "dates": {
        "created_at": "2025-01-15T10:00:00Z",
        "delivered_at": "2025-01-25T14:30:00Z"
      },
      
      "your_role": "buyer",
      "can_review": true
    }
  ],
  
  "summary": {
    "total_orders": 25,
    "by_status": {
      "pending": 2,
      "processing": 3,
      "shipped": 5,
      "delivered": 15
    },
    "total_spent": 15000.00,
    "total_saved": 3500.00
  },
  
  "pagination": {
    "total": 25,
    "limit": 20,
    "offset": 0,
    "has_next": true,
    "has_prev": false
  }
}
```

**Business Logic:**

1. **Query Building:**
   - Select orders where user is buyer or participant
   - Join with products, vendors, groups
   - Apply filters
   - Calculate user's portion in group orders

2. **Role Detection:**
   - `buyer`: User created the order (group admin or individual)
   - `participant`: User joined group order

3. **Status Calculation:**
   - Main status: Order lifecycle stage
   - Payment status: Payment/escrow state
   - Shipping status: Fulfillment state

4. **Permissions:**
   - Calculate what actions user can take
   - `can_cancel`: Before confirmation or within window
   - `can_modify`: Before order is confirmed
   - `can_review`: After delivery

5. **Aggregation:**
   - Calculate total spent
   - Calculate total savings
   - Count orders by status

---

### 2. GET /api/orders/:id

**Purpose:** Get detailed information about a specific order

**Authentication:** Required

**URL Parameters:**
- `id` - Order UUID or order number

**Query Parameters:**
- `include` (optional) - Comma-separated: `participants,timeline,issues,documents`

**Request Example:**
```http
GET /api/orders/uuid-order-1?include=participants,timeline
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "uuid-order-1",
  "order_number": "ORD-2025-001234",
  "type": "group",
  
  "product": {
    "id": "uuid-product-1",
    "name": "Wireless Mouse - Bulk Pack of 20",
    "description": "High-quality wireless mouse perfect for offices",
    "image": "https://example.com/images/mouse.jpg",
    "sku": "WM-BULK-20",
    "specifications": {
      "brand": "TechMouse",
      "color": "Black",
      "wireless": true
    }
  },
  
  "vendor": {
    "id": "uuid-vendor-1",
    "name": "Tech Supplies Co",
    "logo": "https://...",
    "verified": true,
    "rating": 4.8,
    "contact": {
      "email": "sales@techsupplies.com",
      "phone": "+1-555-0100"
    }
  },
  
  "group": {
    "id": "uuid-group-1",
    "name": "Tech Enthusiasts",
    "member_count": 12,
    "admin": {
      "id": "uuid-user-1",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1-555-0200"
    }
  },
  
  "pricing": {
    "price_per_unit": 15.99,
    "total_quantity": 25,
    "subtotal": 399.75,
    "shipping": 25.00,
    "tax": 38.22,
    "total": 462.97,
    "
": {
      "regular_price_per_unit": 25.99,
      "bulk_price_per_unit": 15.99,
      "savings_per_unit": 10.00,
      "total_savings": 250.00,
      "savings_percentage": 38.5
    }
  },
  
  "your_participation": {
    "quantity": 5,
    "amount": 79.95,
    "shipping_share": 5.00,
    "tax_share": 7.64,
    "total": 92.59,
    "savings": 50.00,
    "status": "confirmed",
    "confirmed_at": "2025-01-25T15:30:00Z",
    "paid_at": "2025-01-25T17:00:00Z"
  },
  
  "participants": [
    {
      "user_id": "uuid-user-1",
      "name": "John Doe",
      "avatar": "https://...",
      "role": "admin",
      "quantity": 5,
      "amount": 79.95,
      "status": "confirmed",
      "joined_at": "2025-01-25T14:00:00Z"
    },
    {
      "user_id": "uuid-user-2",
      "name": "Jane Smith",
      "avatar": "https://...",
      "role": "participant",
      "quantity": 10,
      "amount": 159.90,
      "status": "confirmed",
      "joined_at": "2025-01-25T14:30:00Z"
    }
  ],
  
  "shipping": {
    "recipient_name": "John Doe",
    "address": "123 Main Street",
    "city": "San Francisco",
    "state": "CA",
    "zip_code": "94105",
    "country": "USA",
    "phone": "+1-555-0200",
    "delivery_instructions": "Leave at front desk",
    
    "method": "Standard Shipping",
    "carrier": "UPS",
    "tracking_number": "TRACK123456",
    "tracking_url": "https://www.ups.com/track?tracknum=TRACK123456",
    
    "estimated_delivery": "2025-02-10T00:00:00Z",
    "shipped_date": "2025-01-28T10:00:00Z",
    "delivered_date": null
  },
  
  "payment": {
    "method": "escrow",
    "status": "held",
    "escrow_id": "uuid-escrow-1",
    "total_amount": 462.97,
    "amount_held": 462.97,
    "release_date": "2025-02-15T00:00:00Z",
    "transaction_id": "TXN-123456"
  },
  
  "status": "processing",
  "payment_status": "paid",
  "shipping_status": "preparing",
  
  "timeline": [
    {
      "id": "uuid-event-1",
      "status": "created",
      "title": "Order Created",
      "description": "Group admin created the order",
      "actor": {
        "name": "John Doe",
        "role": "admin"
      },
      "timestamp": "2025-01-25T14:00:00Z"
    },
    {
      "id": "uuid-event-2",
      "status": "participant_joined",
      "title": "Participant Joined",
      "description": "Jane Smith joined the order",
      "actor": {
        "name": "Jane Smith",
        "role": "participant"
      },
      "timestamp": "2025-01-25T14:30:00Z"
    },
    {
      "id": "uuid-event-3",
      "status": "confirmed",
      "title": "Order Confirmed",
      "description": "All participants confirmed their participation",
      "timestamp": "2025-01-25T16:00:00Z"
    },
    {
      "id": "uuid-event-4",
      "status": "paid",
      "title": "Payment Received",
      "description": "Payment secured in escrow",
      "timestamp": "2025-01-25T17:00:00Z"
    },
    {
      "id": "uuid-event-5",
      "status": "processing",
      "title": "Vendor Processing",
      "description": "Vendor confirmed and is preparing the order",
      "actor": {
        "name": "Tech Supplies Co",
        "role": "vendor"
      },
      "timestamp": "2025-01-26T09:00:00Z"
    }
  ],
  
  "dates": {
    "created_at": "2025-01-25T14:00:00Z",
    "deadline": "2025-02-08T00:00:00Z",
    "confirmed_at": "2025-01-25T16:00:00Z",
    "paid_at": "2025-01-25T17:00:00Z",
    "processing_at": "2025-01-26T09:00:00Z",
    "shipped_at": null,
    "delivered_at": null,
    "estimated_delivery": "2025-02-10T00:00:00Z"
  },
  
  "actions_available": {
    "can_cancel": false,
    "can_modify_quantity": false,
    "can_leave": false,
    "can_contact_vendor": true,
    "can_track": false,
    "can_confirm_delivery": false,
    "can_report_issue": true,
    "can_review": false
  },
  
  "notes": "Please deliver during business hours (9 AM - 5 PM)",
  
  "created_by": {
    "id": "uuid-user-1",
    "name": "John Doe"
  }
}
```

**Business Logic:**

1. **Authorization:**
   - Verify user is participant or buyer
   - Or vendor for the order
   - Or admin

2. **Data Assembly:**
   - Load complete order details
   - Calculate user's portion
   - Load all participants
   - Build timeline

3. **Status Calculation:**
   - Determine current status
   - Calculate substatus (payment, shipping)
   - Identify bottlenecks

4. **Action Permissions:**
   - Calculate what user can do
   - Based on status and role
   - Time-based restrictions

5. **Conditional Loading:**
   - `participants`: Full participant list
   - `timeline`: Complete event history
   - `issues`: Any reported issues
   - `documents`: Invoice, receipts

---

### 5. POST /api/orders

**Purpose:** Create a new order (individual or group)

**Authentication:** Required

**Request Body - Group Order:**
```json
{
  "type": "group",
  "group_id": "uuid-group-1",
  "product_id": "uuid-product-1",
  "vendor_id": "uuid-vendor-1",
  "price_per_unit": 15.99,
  "minimum_quantity": 20,
  "your_quantity": 5,
  "deadline": "2025-02-08T23:59:59Z",
  "shipping_address": {
    "recipient_name": "John Doe",
    "address": "123 Main Street",
    "city": "San Francisco",
    "state": "CA",
    "zip_code": "94105",
    "country": "USA",
    "phone": "+1-555-0200",
    "delivery_instructions": "Leave at front desk"
  },
  "notes": "Negotiated 40% discount for 20+ units"
}
```

**Request Body - Individual Order:**
```json
{
  "type": "individual",
  "product_id": "uuid-product-1",
  "vendor_id": "uuid-vendor-1",
  "quantity": 10,
  "price_per_unit": 17.99,
  "shipping_address": {
    // same as above
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "order": {
    "id": "uuid-new-order",
    "order_number": "ORD-2025-001236",
    "type": "group",
    "status": "pending",
    "deadline": "2025-02-08T23:59:59Z",
    "minimum_quantity": 20,
    "current_quantity": 5,
    "participants_count": 1,
    "created_at": "2025-01-26T16:00:00Z",
    "payment_url": "/orders/uuid-new-order/pay",
    "share_url": "/orders/uuid-new-order/join"
  }
}
```

**Business Logic:**

**Group Order:**

1. **Authorization:**
   - Verify user is group admin
   - Check group is active

2. **Validation:**
   - Product exists and available
   - Vendor is active
   - Price is valid
   - Deadline is future date
   - Minimum quantity reasonable

3. **Order Creation:**
   - Generate order number (ORD-YYYY-NNNNNN)
   - Set status = 'pending'
   - Create order record
   - Add creator as first participant

4. **Escrow Setup:**
   - Create escrow transaction placeholder
   - Set release conditions

5. **Notifications:**
   - Notify group members
   - Notify vendor
   - Send order details

**Individual Order:**

1. **Validation:**
   - Product available
   - Quantity meets minimum
   - Price valid

2. **Order Creation:**
   - Create order
   - Set status = 'pending'
   - Skip participant collection

3. **Payment:**
   - Direct to payment/escrow
   - No deadline needed

**Error Responses:**

**403 Forbidden:**
```json
{
  "error": "Unauthorized",
  "message": "Only group admins can create group orders"
}
```

**400 Bad Request:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "minimum_quantity",
      "message": "Minimum quantity must be at least 1"
    },
    {
      "field": "deadline",
      "message": "Deadline must be in the future"
    }
  ]
}
```

**400 Bad Request - Product Unavailable:**
```json
{
  "error": "Product unavailable",
  "message": "This product is out of stock",
  "product_id": "uuid-product-1",
  "available_quantity": 0
}
```

---

### 6. POST /api/orders/:id/join

**Purpose:** Join an existing group order

**Authentication:** Required

**URL Parameters:**
- `id` - Order UUID

**Request Body:**
```json
{
  "quantity": 5,
  "shipping_address": {
    "recipient_name": "Jane Smith",
    "address": "456 Oak Avenue",
    "city": "San Francisco",
    "state": "CA",
    "zip_code": "94102",
    "country": "USA",
    "phone": "+1-555-0300"
  },
  "notes": "Please notify before delivery"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Successfully joined the order",
  "participation": {
    "order_id": "uuid-order-1",
    "user_id": "uuid-user-2",
    "quantity": 5,
    "amount": 79.95,
    "status": "pending",
    "joined_at": "2025-01-26T16:30:00Z"
  },
  "order_progress": {
    "current_quantity": 15,
    "minimum_quantity": 20,
    "progress_percentage": 75.0,
    "participants_count": 3
  }
}
```

**Business Logic:**

1. **Authorization:**
   - Verify user is member of the group
   - Check not already in order

2. **Validation:**
   - Order status = 'pending' (not confirmed yet)
   - Deadline not passed
   - Quantity available (vendor stock)
   - Shipping address valid

3. **Join Order:**
   - Add user to participants
   - Set status = 'pending' (needs confirmation)
   - Calculate cost share
   - Update order totals

4. **Progress Check:**
   - Calculate total quantity
   - Check if minimum reached
   - If reached, notify admin to confirm

5. **Notifications:**
   - Notify order creator
   - Notify other participants
   - Update group

**Error Responses:**

**400 Bad Request - Already Joined:**
```json
{
  "error": "Already in order",
  "message": "You are already a participant in this order"
}
```

**400 Bad Request - Order Closed:**
```json
{
  "error": "Order closed",
  "message": "This order is no longer accepting participants",
  "status": "confirmed",
  "closed_at": "2025-01-25T16:00:00Z"
}
```

**400 Bad Request - Deadline Passed:**
```json
{
  "error": "Deadline passed",
  "message": "The deadline for joining this order has passed",
  "deadline": "2025-01-26T00:00:00Z"
}
```

**403 Forbidden:**
```json
{
  "error": "Not a group member",
  "message": "You must be a member of the group to join this order",
  "group_id": "uuid-group-1"
}
```

---

### 7. POST /api/orders/:id/leave

**Purpose:** Leave a group order (before confirmation)

**Authentication:** Required

**URL Parameters:**
- `id` - Order UUID

**Request Body:**
```json
{
  "reason": "Changed my mind",
  "notify_admin": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "You have left the order",
  "order_id": "uuid-order-1",
  "refund": {
    "amount": 0.00,
    "note": "No payment made yet"
  }
}
```

**Business Logic:**

1. **Authorization:**
   - Verify user is participant
   - Check not the order creator (admin)

2. **Validation:**
   - Order status = 'pending' (not confirmed)
   - Or within cancellation window after confirmation

3. **Leave Order:**
   - Remove user from participants
   - Update order totals
   - Refund if payment made

4. **Order Check:**
   - Check if still meets minimum quantity
   - If not, notify admin
   - May need to cancel order

5. **Notifications:**
   - Notify order creator
   - Notify other participants

**Error Responses:**

**400 Bad Request - Cannot Leave:**
```json
{
  "error": "Cannot leave order",
  "message": "Order has been confirmed. Contact admin for cancellation.",
  "status": "confirmed"
}
```

**403 Forbidden - Order Creator:**
```json
{
  "error": "Cannot leave",
  "message": "Order creators cannot leave. You must cancel the entire order.",
  "alternative_action": "cancel_order"
}
```

---

### 8. PUT /api/orders/:id/confirm

**Purpose:** Confirm participation in order

**Authentication:** Required

**Request Body:**
```json
{
  "confirmed": true,
  "payment_method": "escrow"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Order participation confirmed",
  "participation": {
    "status": "confirmed",
    "confirmed_at": "2025-01-26T17:00:00Z"
  },
  "next_step": {
    "action": "payment",
    "url": "/orders/uuid-order-1/pay",
    "amount": 92.59
  }
}
```

**Business Logic:**

1. **Validation:**
   - User is participant
   - Status = 'pending'
   - Payment method valid

2. **Confirm:**
   - Update participation status
   - Set confirmed_at timestamp

3. **Check All Confirmed:**
   - If all participants confirmed
   - Change order status to 'confirmed'
   - Trigger payment collection

4. **Payment Flow:**
   - Create escrow transactions
   - Send payment links
   - Set payment deadline

---

### 9. PUT /api/orders/:id/cancel

**Purpose:** Cancel an order

**Authentication:** Required

**Request Body:**
```json
{
  "reason": "No longer needed",
  "reason_category": "changed_mind",
  "notify_participants": true
}
```

**Reason Categories:**
- `changed_mind`
- `found_better_price`
- `vendor_issue`
- `delivery_delay`
- `product_unavailable`
- `other`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "order": {
    "id": "uuid-order-1",
    "status": "cancelled",
    "cancelled_at": "2025-01-26T17:30:00Z",
    "cancelled_by": "uuid-user-1"
  },
  "refund": {
    "total_amount": 462.97,
    "processing_time": "3-5 business days",
    "method": "escrow_release"
  }
}
```

**Business Logic:**

1. **Authorization:**
   - Order creator can cancel anytime before shipping
   - Participants can cancel own participation
   - Vendor can cancel with valid reason
   - Admin can cancel any order

2. **Cancellation Rules:**

   **Before Payment:**
   - Free cancellation
   - No fees

   **After Payment (Pending/Processing):**
   - May have cancellation fee (5-10%)
   - Full refund minus fee

   **After Shipping:**
   - Cannot cancel
   - Must use return process

3. **Refund Process:**
   - Release escrow funds
   - Deduct cancellation fees if applicable
   - Return to user wallets
   - Process within 3-5 days

4. **Inventory:**
   - Release reserved inventory
   - Make available again

5. **Notifications:**
   - Notify all participants
   - Notify vendor
   - Send cancellation confirmation

**Error Responses:**

**400 Bad Request - Cannot Cancel:**
```json
{
  "error": "Cannot cancel order",
  "message": "Order has already been shipped",
  "status": "shipped",
  "shipped_date": "2025-01-28T10:00:00Z",
  "alternative": "You can return the order after delivery"
}
```

**400 Bad Request - Cancellation Fee:**
```json
{
  "error": "Cancellation fee applies",
  "message": "Order is in processing. A cancellation fee will be charged.",
  "fee": {
    "amount": 46.30,
    "percentage": 10.0,
    "refund_amount": 416.67
  },
  "confirmation_required": true
}
```

---

### 13. GET /api/orders/:id/tracking

**Purpose:** Get real-time shipping tracking information

**Authentication:** Required

**Response (200 OK):**
```json
{
  "order_id": "uuid-order-1",
  "order_number": "ORD-2025-001234",
  
  "tracking": {
    "tracking_number": "TRACK123456",
    "carrier": "UPS",
    "carrier_logo": "https://...",
    "tracking_url": "https://www.ups.com/track?tracknum=TRACK123456",
    
    "status": "in_transit",
    "status_description": "Package is on the way",
    
    "estimated_delivery": "2025-02-10T00:00:00Z",
    "actual_delivery": null,
    
    "current_location": {
      "city": "Sacramento",
      "state": "CA",
      "country": "USA",
      "facility": "UPS Distribution Center",
      "timestamp": "2025-01-29T14:30:00Z"
    },
    
    "origin": {
      "city": "San Francisco",
      "state": "CA",
      "shipped_date": "2025-01-28T10:00:00Z"
    },
    
    "destination": {
      "city": "San Francisco",
      "state": "CA",
      "address": "123 Main Street"
    },
    
    "events": [
      {
        "status": "shipped",
        "description": "Package shipped from warehouse",
        "location": "San Francisco, CA",
        "timestamp": "2025-01-28T10:00:00Z"
      },
      {
        "status": "in_transit",
        "description": "Package in transit",
        "location": "Oakland, CA",
        "timestamp": "2025-01-28T18:00:00Z"
      },
      {
        "status": "in_transit",
        "description": "Package arrived at distribution center",
        "location": "Sacramento, CA",
        "timestamp": "2025-01-29T14:30:00Z"
      },
      {
        "status": "out_for_delivery",
        "description": "Out for delivery",
        "location": "San Francisco, CA",
        "timestamp": "2025-01-30T08:00:00Z",
        "estimated": true
      }
    ],
    
    "delivery_instructions": "Leave at front desk",
    "signature_required": false,
    
    "last_updated": "2025-01-29T14:30:00Z"
  }
}
```

**Business Logic:**
- Verify user is participant
- Fetch tracking info from carrier API
- Parse and format tracking events
- Calculate estimated delivery
- Cache tracking data (refresh every hour)

**Tracking Status Values:**
- `label_created`: Shipping label created
- `picked_up`: Package picked up by carrier
- `in_transit`: Package in transit
- `out_for_delivery`: Out for delivery
- `delivered`: Successfully delivered
- `delivery_failed`: Delivery attempt failed
- `exception`: Exception occurred
- `returned`: Returned to sender

---

### 15. POST /api/orders/:id/received

**Purpose:** Confirm order has been received

**Authentication:** Required

**Request Body:**
```json
{
  "received": true,
  "condition": "excellent",
  "all_items_present": true,
  "notes": "Everything looks great!",
  "photos": [
    "https://storage.com/order-photo-1.jpg"
  ]
}
```

**Condition Values:**
- `excellent`: Perfect condition
- `good`: Minor issues
- `damaged`: Significant damage
- `missing_items`: Items missing

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Order marked as received",
  "order": {
    "id": "uuid-order-1",
    "status": "delivered",
    "delivered_at": "2025-01-30T14:00:00Z"
  },
  "escrow": {
    "status": "released",
    "released_at": "2025-01-30T14:00:00Z",
    "amount": 462.97,
    "released_to": "vendor"
  },
  "next_steps": {
    "can_review_product": true,
    "can_review_vendor": true,
    "review_url": "/orders/uuid-order-1/review"
  }
}
```

**Business Logic:**

1. **Validation:**
   - User is participant
   - Order status = 'shipped'
   - Tracking shows delivered or manual confirmation

2. **Condition Check:**
   - If `excellent` or `good`: Complete normally
   - If `damaged` or `missing_items`: Create issue automatically

3. **Order Completion:**
   - Update status to 'delivered'
   - Set delivered_at timestamp
   - Mark as completed

4. **Escrow Release:**
   - If condition good, release escrow to vendor
   - If issues, hold escrow pending resolution
   - Set release_date

5. **Post-Delivery:**
   - Enable review capability
   - Request product review
   - Request vendor review
   - Update statistics

**Error Responses:**

**400 Bad Request - Too Early:**
```json
{
  "error": "Order not yet delivered",
  "message": "Tracking shows order is still in transit",
  "tracking_status": "in_transit",
  "estimated_delivery": "2025-02-10T00:00:00Z"
}
```

**400 Bad Request - Issues Reported:**
```json
{
  "error": "Issues reported",
  "message": "You've reported issues with the order. Please resolve before confirming.",
  "condition": "damaged",
  "action_required": "Please contact vendor or open a dispute"
}
```

---

### 17. POST /api/orders/:id/issues

**Purpose:** Report an issue with an order

**Authentication:** Required

**Request Body:**
```json
{
  "issue_type": "damaged_product",
  "severity": "high",
  "title": "Product arrived damaged",
  "description": "The wireless mouse packaging was crushed and several items are broken",
  "affected_items": [
    {
      "product_id": "uuid-product-1",
      "quantity": 2,
      "issue": "Broken"
    }
  ],
  "photos": [
    "https://storage.com/damage-photo-1.jpg",
    "https://storage.com/damage-photo-2.jpg"
  ],
  "desired_resolution": "partial_refund",
  "requested_amount": 31.98
}
```

**Issue Types:**
- `damaged_product`: Product arrived damaged
- `missing_items`: Items missing from order
- `wrong_product`: Received wrong product
- `defective`: Product is defective
- `quality_issue`: Quality below expectations
- `late_delivery`: Delivery significantly delayed
- `never_arrived`: Order never delivered
- `vendor_communication`: Vendor not responding
- `other`: Other issues

**Severity:**
- `low`: Minor inconvenience
- `medium`: Significant issue
- `high`: Major problem
- `critical`: Complete failure

**Desired Resolution:**
- `full_refund`: Complete refund
- `partial_refund`: Partial refund
- `replacement`: Send replacement
- `repair`: Repair product
- `store_credit`: Store credit

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Issue reported successfully",
  "issue": {
    "id": "uuid-issue-1",
    "order_id": "uuid-order-1",
    "issue_number": "ISS-2025-001",
    "type": "damaged_product",
    "severity": "high",
    "status": "open",
    "created_at": "2025-01-30T15:00:00Z",
    "response_deadline": "2025-02-02T15:00:00Z"
  },
  "next_steps": {
    "vendor_notified": true,
    "admin_notified": true,
    "escrow_held": true,
    "expected_response": "Vendor has 3 days to respond"
  }
}
```

**Business Logic:**

1. **Validation:**
   - User is participant
   - Order exists and delivered/shipped
   - Photos provided for damage claims

2. **Issue Creation:**
   - Generate issue number
   - Set status = 'open'
   - Set severity
   - Store evidence (photos)

3. **Escrow Hold:**
   - If escrow not released, hold it
   - If already released, flag for admin review
   - Calculate refund amount

4. **Notifications:**
   - Notify vendor immediately
   - Notify admin if high/critical
   - Set response deadline (3 days)

5. **Escalation:**
   - If vendor doesn't respond in 3 days, escalate to admin
   - If unresolved in 7 days, offer dispute process

**Error Responses:**

**400 Bad Request:**
```json
{
  "error": "Cannot report issue",
  "message": "Order has not been delivered yet",
  "status": "processing"
}
```

---

### 18. GET /api/orders/:id/issues

**Purpose:** Get all issues for an order

**Authentication:** Required

**Response (200 OK):**
```json
{
  "order_id": "uuid-order-1",
  "issues": [
    {
      "id": "uuid-issue-1",
      "issue_number": "ISS-2025-001",
      "type": "damaged_product",
      "severity": "high",
      "title": "Product arrived damaged",
      "status": "resolved",
      "resolution": {
        "type": "partial_refund",
        "amount": 31.98,
        "resolved_by": "vendor",
        "resolved_at": "2025-01-31T10:00:00Z",
        "notes": "Refund processed for damaged items"
      },
      "created_at": "2025-01-30T15:00:00Z"
    }
  ]
}
```

---

### 20. POST /api/orders/:id/refund

**Purpose:** Request a refund

**Authentication:** Required

**Request Body:**
```json
{
  "reason": "Product defective",
  "reason_category": "defective",
  "refund_type": "full",
  "amount": 92.59,
  "return_items": true,
  "issue_id": "uuid-issue-1"
}
```

**Refund Types:**
- `full`: Complete refund
- `partial`: Partial refund
- `shipping_only`: Refund shipping costs
- `difference`: Price difference

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Refund request submitted",
  "refund": {
    "id": "uuid-refund-1",
    "order_id": "uuid-order-1",
    "amount": 92.59,
    "type": "full",
    "status": "pending",
    "requires_return": true,
    "return_label_url": "https://...",
    "estimated_processing": "5-7 business days",
    "created_at": "2025-01-30T16:00:00Z"
  }
}
```

**Business Logic:**
- Create refund request
- If items need return, generate return label
- Hold escrow or process refund
- Notify vendor
- Update order status

---

### 21. GET /api/orders/:id/invoice

**Purpose:** Get order invoice

**Authentication:** Required

**Response (200 OK):**
```json
{
  "invoice_number": "INV-2025-001234",
  "order_number": "ORD-2025-001234",
  "invoice_date": "2025-01-25T17:00:00Z",
  "due_date": "2025-01-25T17:00:00Z",
  "status": "paid",
  
  "seller": {
    "name": "Tech Supplies Co",
    "address": "123 Tech Street",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94105",
    "tax_id": "XX-XXXXXXX"
  },
  
  "buyer": {
    "name": "John Doe",
    "email": "john@example.com",
    "address": "123 Main Street",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94105"
  },
  
  "items": [
    {
      "description": "Wireless Mouse - Bulk Pack of 20",
      "quantity": 5,
      "price_per_unit": 15.99,
      "subtotal": 79.95
    }
  ],
  
  "totals": {
    "subtotal": 79.95,
    "shipping": 5.00,
    "tax": 7.64,
    "total": 92.59
  },
  
  "payment": {
    "method": "Escrow",
    "transaction_id": "TXN-123456",
    "paid_date": "2025-01-25T17:00:00Z"
  },
  
  "pdf_url": "/api/orders/uuid-order-1/invoice.pdf"
}
```

---

## 🗄️ Database Tables

### orders
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('individual', 'group')),
  
  product_id UUID NOT NULL REFERENCES products(id),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  group_id UUID REFERENCES groups(id),
  
  price_per_unit DECIMAL(10,2) NOT NULL,
  total_quantity INT NOT NULL,
  minimum_quantity INT,
  
  subtotal DECIMAL(10,2) NOT NULL,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'held', 'released', 'refunded')),
  shipping_status VARCHAR(20) DEFAULT 'pending' CHECK (shipping_status IN ('pending', 'preparing', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'failed')),
  
  shipping_address JSONB NOT NULL,
  tracking_number VARCHAR(100),
  carrier VARCHAR(50),
  
  deadline TIMESTAMP,
  estimated_delivery TIMESTAMP,
  
  created_by UUID NOT NULL REFERENCES users(id),
  cancelled_by UUID REFERENCES users(id),
  
  notes TEXT,
  internal_notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP,
  paid_at TIMESTAMP,
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_vendor ON orders(vendor_id);
CREATE INDEX idx_orders_group ON orders(group_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_by ON orders(created_by);
CREATE INDEX idx_orders_number ON orders(order_number);
```

### order_participants
```sql
CREATE TABLE order_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  
  quantity INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled')),
  
  shipping_address JSONB,
  
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP,
  paid_at TIMESTAMP,
  
  UNIQUE(order_id, user_id)
);

CREATE INDEX idx_order_participants_order ON order_participants(order_id);
CREATE INDEX idx_order_participants_user ON order_participants(user_id);
```

### order_timeline
```sql
CREATE TABLE order_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  status VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  
  actor_id UUID REFERENCES users(id),
  actor_type VARCHAR(20),
  
  metadata JSONB,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_timeline_order ON order_timeline(order_id);
```

### order_issues
```sql
CREATE TABLE order_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_number VARCHAR(50) UNIQUE NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id),
  reported_by UUID NOT NULL REFERENCES users(id),
  
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  
  desired_resolution VARCHAR(50),
  requested_amount DECIMAL(10,2),
  
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'escalated')),
  
  resolution_type VARCHAR(50),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP,
  
  photos TEXT[],
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🎉 Summary

The **Orders Routes** provide complete order lifecycle management with:

- ✅ **Order Creation** - Individual and group orders
- ✅ **Participant Management** - Join, leave, confirm
- ✅ **Order Tracking** - Real-time shipping updates
- ✅ **Payment Integration** - Escrow system
- ✅ **Issue Management** - Report and resolve problems
- ✅ **Order History** - Complete purchase records
- ✅ **Documents** - Invoices, receipts
- ✅ **Notifications** - Keep everyone informed

All endpoints support the complete purchasing journey! 📦
