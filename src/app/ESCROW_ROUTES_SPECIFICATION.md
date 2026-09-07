# 💰 Escrow Routes Specification

## Overview

The **Escrow Routes** manage the secure payment system for the "Save Together, Buy Smarter" bulk purchasing application. The escrow system holds funds securely until order delivery is confirmed, protecting both buyers and vendors.

---

## 🎯 What Escrow Routes Are For

In your bulk purchasing app, **Escrow** enables:

1. **Secure Payments** - Hold funds until delivery confirmed
2. **Buyer Protection** - Money back if order not received
3. **Vendor Protection** - Guaranteed payment upon delivery
4. **Dispute Resolution** - Neutral third party holds funds
5. **Transaction Tracking** - Complete payment history
6. **Automated Releases** - Trigger-based fund disbursement
7. **Refund Management** - Handle returns and cancellations

---

## 🏗️ Escrow Architecture

### Base Route
```
/api/escrow
```

### Authentication
- **All endpoints require authentication**
- Role-based permissions (buyer, vendor, admin)

### Escrow Flow
```
Order Created → Funds Deposited → Held in Escrow → Order Delivered → Funds Released → Vendor Receives Payment
                                        ↓
                                   Issue Reported → Dispute → Resolution
```

---

## 📍 Complete Endpoint List

### Escrow Transactions (6 endpoints)
1. `GET /api/escrow/transactions` - List user's escrow transactions
2. `GET /api/escrow/transactions/:id` - Get transaction details
3. `POST /api/escrow/transactions` - Create escrow transaction
4. `PUT /api/escrow/transactions/:id/deposit` - Deposit funds
5. `PUT /api/escrow/transactions/:id/release` - Release funds to vendor
6. `PUT /api/escrow/transactions/:id/refund` - Refund to buyer

### Escrow Management (4 endpoints)
7. `GET /api/escrow/balance` - Get escrow balance
8. `GET /api/escrow/pending` - Get pending transactions
9. `GET /api/escrow/history` - Get transaction history
10. `POST /api/escrow/transactions/:id/dispute` - Open dispute

### Payment Methods (3 endpoints)
11. `GET /api/escrow/payment-methods` - Get payment methods
12. `POST /api/escrow/payment-methods` - Add payment method
13. `DELETE /api/escrow/payment-methods/:id` - Remove payment method

### Escrow Analytics (2 endpoints)
14. `GET /api/escrow/summary` - Get escrow summary
15. `GET /api/escrow/reports` - Generate escrow reports

---

## 📖 Detailed Endpoint Specifications

---

### 1. GET /api/escrow/transactions

**Purpose:** List all escrow transactions for authenticated user

**Authentication:** Required

**Query Parameters:**
- `status` (optional) - `pending`, `held`, `released`, `refunded`, `disputed`
- `type` (optional) - `deposit`, `release`, `refund`, `hold`
- `role` (optional) - `buyer`, `seller` (filter by user's role in transaction)
- `order_id` (optional) - Filter by specific order
- `date_from` (optional) - Start date
- `date_to` (optional) - End date
- `sort_by` (optional) - `date`, `amount`, `status`
- `order` (optional) - `asc`, `desc` (default: `desc`)
- `limit` (optional) - Results per page (default: 20)
- `offset` (optional) - Pagination offset

**Request Example:**
```http
GET /api/escrow/transactions?status=held&role=buyer&sort_by=date
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "transactions": [
    {
      "id": "uuid-escrow-1",
      "transaction_number": "ESC-2025-001234",
      
      "order": {
        "id": "uuid-order-1",
        "order_number": "ORD-2025-001234",
        "product_name": "Wireless Mouse Bulk Pack"
      },
      
      "amount": 92.59,
      "currency": "USD",
      
      "buyer": {
        "id": "uuid-user-1",
        "name": "John Doe"
      },
      
      "seller": {
        "id": "uuid-vendor-1",
        "name": "Tech Supplies Co",
        "type": "vendor"
      },
      
      "status": "held",
      "type": "deposit",
      
      "your_role": "buyer",
      
      "dates": {
        "created_at": "2025-01-25T17:00:00Z",
        "deposited_at": "2025-01-25T17:05:00Z",
        "hold_until": "2025-02-15T00:00:00Z",
        "release_scheduled": "2025-02-10T00:00:00Z"
      },
      
      "conditions": {
        "auto_release": true,
        "release_trigger": "delivery_confirmation",
        "dispute_window": 7
      },
      
      "fees": {
        "platform_fee": 4.63,
        "processing_fee": 2.78,
        "total_fees": 7.41
      }
    }
  ],
  
  "summary": {
    "total_transactions": 45,
    "total_held": 2500.00,
    "total_released": 15000.00,
    "total_refunded": 500.00,
    "by_status": {
      "pending": 2,
      "held": 8,
      "released": 30,
      "refunded": 5
    }
  },
  
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0,
    "has_next": true
  }
}
```

**Business Logic:**

1. **Role-Based Filtering:**
   - If `role=buyer`: Show transactions where user is buyer
   - If `role=seller`: Show transactions where user is seller (vendor)
   - If not specified: Show all transactions user is involved in

2. **Status Meanings:**
   - `pending`: Awaiting deposit
   - `held`: Funds held in escrow
   - `released`: Funds released to seller
   - `refunded`: Funds returned to buyer
   - `disputed`: Under dispute

3. **Data Aggregation:**
   - Calculate total amounts by status
   - Sum fees paid/earned
   - Track transaction counts

---

### 2. GET /api/escrow/transactions/:id

**Purpose:** Get detailed information about a specific escrow transaction

**Authentication:** Required

**URL Parameters:**
- `id` - Escrow transaction UUID

**Response (200 OK):**
```json
{
  "id": "uuid-escrow-1",
  "transaction_number": "ESC-2025-001234",
  
  "order": {
    "id": "uuid-order-1",
    "order_number": "ORD-2025-001234",
    "type": "group",
    "product": {
      "id": "uuid-product-1",
      "name": "Wireless Mouse Bulk Pack",
      "image": "https://..."
    }
  },
  
  "amount": 92.59,
  "currency": "USD",
  
  "buyer": {
    "id": "uuid-user-1",
    "name": "John Doe",
    "email": "john@example.com"
  },
  
  "seller": {
    "id": "uuid-vendor-1",
    "name": "Tech Supplies Co",
    "type": "vendor",
    "business_name": "Tech Supplies Corporation"
  },
  
  "status": "held",
  "type": "deposit",
  
  "breakdown": {
    "order_amount": 92.59,
    "platform_fee": 4.63,
    "processing_fee": 2.78,
    "total_deposited": 100.00,
    "seller_will_receive": 85.18
  },
  
  "payment_method": {
    "type": "credit_card",
    "last_4": "4242",
    "brand": "Visa"
  },
  
  "conditions": {
    "auto_release": true,
    "release_trigger": "delivery_confirmation",
    "manual_release_required": false,
    "dispute_window_days": 7,
    "dispute_window_ends": "2025-02-17T00:00:00Z"
  },
  
  "timeline": [
    {
      "event": "created",
      "description": "Escrow transaction created",
      "timestamp": "2025-01-25T17:00:00Z"
    },
    {
      "event": "deposited",
      "description": "Funds deposited to escrow",
      "amount": 100.00,
      "payment_method": "Visa ending in 4242",
      "timestamp": "2025-01-25T17:05:00Z"
    },
    {
      "event": "held",
      "description": "Funds held in escrow pending delivery",
      "hold_until": "2025-02-15T00:00:00Z",
      "timestamp": "2025-01-25T17:05:00Z"
    },
    {
      "event": "order_shipped",
      "description": "Order shipped by vendor",
      "tracking": "TRACK123456",
      "timestamp": "2025-01-28T10:00:00Z"
    },
    {
      "event": "scheduled_release",
      "description": "Release scheduled upon delivery confirmation",
      "scheduled_for": "2025-02-10T00:00:00Z",
      "timestamp": "2025-01-28T10:00:00Z"
    }
  ],
  
  "dates": {
    "created_at": "2025-01-25T17:00:00Z",
    "deposited_at": "2025-01-25T17:05:00Z",
    "hold_until": "2025-02-15T00:00:00Z",
    "release_scheduled": "2025-02-10T00:00:00Z",
    "released_at": null,
    "refunded_at": null
  },
  
  "dispute": null,
  
  "your_role": "buyer",
  "actions_available": {
    "can_cancel": false,
    "can_dispute": false,
    "can_request_refund": false,
    "dispute_available_after_delivery": true
  }
}
```

**Business Logic:**

1. **Authorization:**
   - Verify user is buyer or seller
   - Or admin

2. **Data Assembly:**
   - Load complete transaction details
   - Calculate fee breakdown
   - Build timeline
   - Check for disputes

3. **Action Permissions:**
   - Calculate available actions based on:
     - Current status
     - User role
     - Time windows
     - Order status

---

### 3. POST /api/escrow/transactions

**Purpose:** Create a new escrow transaction for an order

**Authentication:** Required

**Request Body:**
```json
{
  "order_id": "uuid-order-1",
  "amount": 92.59,
  "currency": "USD",
  "auto_release": true,
  "release_conditions": {
    "trigger": "delivery_confirmation",
    "hold_days": 7
  },
  "payment_method_id": "uuid-payment-method-1"
}
```

**Release Triggers:**
- `delivery_confirmation`: Release when buyer confirms delivery
- `tracking_delivered`: Release when tracking shows delivered
- `time_based`: Release after X days
- `manual`: Requires manual release approval

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Escrow transaction created",
  "transaction": {
    "id": "uuid-escrow-new",
    "transaction_number": "ESC-2025-001235",
    "status": "pending",
    "amount": 92.59,
    "total_with_fees": 100.00,
    "created_at": "2025-01-26T16:00:00Z"
  },
  "next_step": {
    "action": "deposit_funds",
    "url": "/api/escrow/transactions/uuid-escrow-new/deposit",
    "payment_required": true
  }
}
```

**Business Logic:**

1. **Validation:**
   - Order exists and belongs to user
   - Order status allows escrow creation
   - Amount matches order total
   - Payment method valid

2. **Fee Calculation:**
   - Platform fee: 5% of amount
   - Processing fee: 3% of amount
   - Total with fees

3. **Transaction Creation:**
   - Generate transaction number
   - Set status = 'pending'
   - Link to order
   - Set buyer and seller

4. **Conditions Setup:**
   - Configure auto-release settings
   - Set hold period
   - Define release trigger
   - Calculate dispute window

**Error Responses:**

**400 Bad Request:**
```json
{
  "error": "Escrow already exists",
  "message": "An escrow transaction already exists for this order",
  "existing_transaction_id": "uuid-escrow-1"
}
```

---

### 4. PUT /api/escrow/transactions/:id/deposit

**Purpose:** Deposit funds into escrow

**Authentication:** Required (Buyer)

**Request Body:**
```json
{
  "payment_method_id": "uuid-payment-method-1",
  "save_payment_method": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Funds deposited to escrow",
  "transaction": {
    "id": "uuid-escrow-1",
    "status": "held",
    "amount": 92.59,
    "deposited_at": "2025-01-26T16:30:00Z",
    "hold_until": "2025-02-15T00:00:00Z"
  },
  "payment": {
    "amount_charged": 100.00,
    "payment_method": "Visa ending in 4242",
    "transaction_id": "TXN-123456",
    "receipt_url": "/api/escrow/transactions/uuid-escrow-1/receipt"
  }
}
```

**Business Logic:**

1. **Authorization:**
   - Verify user is buyer
   - Check transaction status = 'pending'

2. **Payment Processing:**
   - Charge payment method
   - Include platform and processing fees
   - Process through payment gateway (Stripe, etc.)

3. **Status Update:**
   - Change status to 'held'
   - Set deposited_at timestamp
   - Calculate hold_until date
   - Update order payment status

4. **Notifications:**
   - Notify seller funds are secured
   - Notify buyer of successful payment
   - Update order status

**Error Responses:**

**400 Bad Request - Payment Failed:**
```json
{
  "error": "Payment failed",
  "message": "Unable to process payment",
  "reason": "Insufficient funds",
  "payment_method": "Visa ending in 4242"
}
```

---

### 5. PUT /api/escrow/transactions/:id/release

**Purpose:** Release funds from escrow to seller

**Authentication:** Required (Buyer confirms delivery, or auto-release)

**Request Body:**
```json
{
  "reason": "delivery_confirmed",
  "notes": "Order received in perfect condition",
  "rating": 5
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Funds released to seller",
  "transaction": {
    "id": "uuid-escrow-1",
    "status": "released",
    "amount": 92.59,
    "released_at": "2025-02-10T14:00:00Z"
  },
  "payout": {
    "seller_received": 85.18,
    "platform_fee": 4.63,
    "processing_fee": 2.78,
    "payout_method": "bank_transfer",
    "estimated_arrival": "2025-02-12T00:00:00Z"
  }
}
```

**Business Logic:**

1. **Authorization:**
   - Buyer can release after delivery
   - System can auto-release based on conditions
   - Admin can release in disputes

2. **Validation:**
   - Transaction status = 'held'
   - Order delivered or conditions met
   - No open disputes

3. **Release Process:**
   - Update status to 'released'
   - Calculate seller's amount (minus fees)
   - Initiate payout to seller
   - Set released_at timestamp

4. **Payout:**
   - Transfer to seller's account
   - Process through payment processor
   - Track payout status
   - Notify seller

5. **Order Completion:**
   - Mark order as completed
   - Enable review capability
   - Update statistics

**Error Responses:**

**400 Bad Request - Cannot Release:**
```json
{
  "error": "Cannot release funds",
  "message": "Order has not been delivered yet",
  "order_status": "shipped",
  "estimated_delivery": "2025-02-10T00:00:00Z"
}
```

**400 Bad Request - Dispute Active:**
```json
{
  "error": "Dispute in progress",
  "message": "Funds cannot be released while dispute is active",
  "dispute_id": "uuid-dispute-1",
  "dispute_status": "open"
}
```

---

### 6. PUT /api/escrow/transactions/:id/refund

**Purpose:** Refund funds from escrow to buyer

**Authentication:** Required (Seller agrees, or admin approves)

**Request Body:**
```json
{
  "reason": "order_cancelled",
  "reason_details": "Product out of stock",
  "refund_type": "full",
  "amount": 92.59,
  "deduct_fees": false
}
```

**Refund Types:**
- `full`: Complete refund including fees
- `partial`: Partial refund
- `full_minus_fees`: Refund order amount, keep fees
- `custom`: Custom amount

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Refund processed",
  "transaction": {
    "id": "uuid-escrow-1",
    "status": "refunded",
    "refunded_at": "2025-01-26T17:00:00Z"
  },
  "refund": {
    "amount": 92.59,
    "fees_refunded": 7.41,
    "total_refund": 100.00,
    "method": "original_payment_method",
    "estimated_arrival": "3-5 business days",
    "refund_id": "REF-123456"
  }
}
```

**Business Logic:**

1. **Authorization:**
   - Seller can refund before shipping
   - Buyer can request, seller must approve
   - Admin can force refund

2. **Refund Calculation:**
   - Determine refund amount
   - Check if fees should be refunded
   - Calculate penalty if applicable

3. **Refund Processing:**
   - Update status to 'refunded'
   - Process refund through payment gateway
   - Return to original payment method
   - Set refunded_at timestamp

4. **Order Update:**
   - Update order status to cancelled/refunded
   - Release inventory
   - Log refund reason

5. **Notifications:**
   - Notify buyer of refund
   - Notify seller of refund processed
   - Send receipt

**Refund Fee Rules:**
- **Before confirmation:** Full refund including all fees
- **After confirmation, before shipping:** Full refund minus processing fee (3%)
- **After shipping:** Partial refund, restocking fee may apply (10%)
- **Seller fault:** Full refund including all fees

---

### 7. GET /api/escrow/balance

**Purpose:** Get user's escrow balance summary

**Authentication:** Required

**Response (200 OK):**
```json
{
  "user_id": "uuid-user-1",
  
  "as_buyer": {
    "total_held": 2500.00,
    "total_pending": 500.00,
    "transactions_count": 8,
    "oldest_transaction": "2025-01-15T00:00:00Z"
  },
  
  "as_seller": {
    "total_held": 15000.00,
    "total_pending_release": 8000.00,
    "available_for_payout": 7000.00,
    "transactions_count": 45,
    "next_release": {
      "amount": 1200.00,
      "date": "2025-02-01T00:00:00Z",
      "order_id": "uuid-order-1"
    }
  },
  
  "total_in_escrow": 17500.00,
  "currency": "USD",
  
  "pending_actions": {
    "awaiting_deposit": 2,
    "awaiting_delivery_confirmation": 5,
    "disputes": 0
  }
}
```

**Business Logic:**
- Aggregate all escrow transactions
- Calculate totals by role (buyer/seller)
- Identify pending actions
- Show upcoming releases

---

### 8. GET /api/escrow/pending

**Purpose:** Get all pending escrow transactions requiring action

**Authentication:** Required

**Response (200 OK):**
```json
{
  "pending_transactions": [
    {
      "id": "uuid-escrow-1",
      "transaction_number": "ESC-2025-001234",
      "order_number": "ORD-2025-001234",
      "amount": 92.59,
      "status": "pending",
      "action_required": "deposit_funds",
      "deadline": "2025-01-28T00:00:00Z",
      "your_role": "buyer"
    },
    {
      "id": "uuid-escrow-2",
      "transaction_number": "ESC-2025-001235",
      "order_number": "ORD-2025-001235",
      "amount": 450.00,
      "status": "held",
      "action_required": "confirm_delivery",
      "your_role": "buyer",
      "order_status": "delivered",
      "delivered_at": "2025-01-25T14:00:00Z"
    }
  ],
  "total_pending": 2,
  "total_amount": 542.59
}
```

**Action Types:**
- `deposit_funds`: Buyer needs to pay
- `confirm_delivery`: Buyer needs to confirm receipt
- `release_funds`: Auto-release scheduled but can be done early
- `resolve_dispute`: Dispute needs resolution

---

### 10. POST /api/escrow/transactions/:id/dispute

**Purpose:** Open a dispute for an escrow transaction

**Authentication:** Required

**Request Body:**
```json
{
  "dispute_type": "item_not_received",
  "description": "Order was marked as delivered but I never received it",
  "evidence": [
    "https://storage.com/evidence-1.jpg",
    "https://storage.com/evidence-2.jpg"
  ],
  "desired_outcome": "full_refund",
  "amount": 92.59
}
```

**Dispute Types:**
- `item_not_received`: Order never arrived
- `item_damaged`: Product arrived damaged
- `item_not_as_described`: Product doesn't match description
- `wrong_item`: Received wrong product
- `partial_delivery`: Some items missing
- `quality_issue`: Quality below expectations
- `vendor_not_responding`: Vendor unresponsive

**Desired Outcomes:**
- `full_refund`: Complete refund
- `partial_refund`: Partial refund
- `replacement`: Send replacement
- `price_adjustment`: Reduce price
- `resolution_with_vendor`: Work with vendor

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Dispute opened successfully",
  "dispute": {
    "id": "uuid-dispute-1",
    "dispute_number": "DIS-2025-001",
    "escrow_transaction_id": "uuid-escrow-1",
    "order_id": "uuid-order-1",
    "type": "item_not_received",
    "status": "open",
    "created_at": "2025-02-12T10:00:00Z",
    "response_deadline": "2025-02-15T10:00:00Z"
  },
  "next_steps": {
    "funds_held": true,
    "vendor_notified": true,
    "admin_assigned": true,
    "response_time": "Vendor has 3 days to respond",
    "escalation_time": "Dispute will escalate to admin if unresolved in 7 days"
  }
}
```

**Business Logic:**

1. **Validation:**
   - Transaction exists and user is participant
   - Status = 'held' (funds in escrow)
   - No existing open dispute
   - Within dispute window

2. **Dispute Creation:**
   - Generate dispute number
   - Set status = 'open'
   - Store evidence
   - Link to transaction and order

3. **Funds Hold:**
   - Prevent auto-release
   - Hold funds indefinitely
   - Log dispute

4. **Notifications:**
   - Notify other party (seller/buyer)
   - Notify admin
   - Set response deadline (3 days)

5. **Escalation:**
   - If no response in 3 days, remind
   - If no resolution in 7 days, escalate to admin
   - Admin reviews and makes decision

**Dispute Resolution Process:**
```
Open → Vendor Response → Negotiation → Resolution
  ↓                                        ↓
Escalation (7 days) → Admin Review → Admin Decision
```

**Error Responses:**

**400 Bad Request - Dispute Window Closed:**
```json
{
  "error": "Dispute window closed",
  "message": "Dispute window has expired. Contact support for assistance.",
  "released_at": "2025-02-10T14:00:00Z",
  "dispute_window_ended": "2025-02-17T14:00:00Z"
}
```

**400 Bad Request - Existing Dispute:**
```json
{
  "error": "Dispute already exists",
  "message": "An open dispute already exists for this transaction",
  "dispute_id": "uuid-dispute-1",
  "dispute_status": "open"
}
```

---

### 11. GET /api/escrow/payment-methods

**Purpose:** Get user's saved payment methods

**Authentication:** Required

**Response (200 OK):**
```json
{
  "payment_methods": [
    {
      "id": "uuid-pm-1",
      "type": "credit_card",
      "brand": "Visa",
      "last_4": "4242",
      "exp_month": 12,
      "exp_year": 2026,
      "is_default": true,
      "billing_address": {
        "city": "San Francisco",
        "state": "CA",
        "zip": "94105",
        "country": "US"
      },
      "created_at": "2025-01-15T00:00:00Z"
    },
    {
      "id": "uuid-pm-2",
      "type": "bank_account",
      "bank_name": "Chase Bank",
      "account_type": "checking",
      "last_4": "1234",
      "is_default": false,
      "created_at": "2025-01-20T00:00:00Z"
    }
  ],
  "default_payment_method": "uuid-pm-1"
}
```

---

### 12. POST /api/escrow/payment-methods

**Purpose:** Add a new payment method

**Authentication:** Required

**Request Body:**
```json
{
  "type": "credit_card",
  "token": "tok_visa",
  "set_as_default": true,
  "billing_address": {
    "address": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94105",
    "country": "US"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Payment method added",
  "payment_method": {
    "id": "uuid-pm-3",
    "type": "credit_card",
    "brand": "Visa",
    "last_4": "4242",
    "is_default": true
  }
}
```

---

### 14. GET /api/escrow/summary

**Purpose:** Get comprehensive escrow summary and statistics

**Authentication:** Required

**Query Parameters:**
- `period` (optional) - `week`, `month`, `year`, `all_time`

**Response (200 OK):**
```json
{
  "period": "month",
  "date_range": {
    "start": "2025-01-01T00:00:00Z",
    "end": "2025-01-31T23:59:59Z"
  },
  
  "as_buyer": {
    "total_deposited": 5000.00,
    "total_refunded": 500.00,
    "transactions_count": 15,
    "fees_paid": 250.00,
    "average_transaction": 333.33,
    "disputes_opened": 1,
    "disputes_won": 1
  },
  
  "as_seller": {
    "total_received": 45000.00,
    "total_refunded": 2000.00,
    "net_received": 43000.00,
    "transactions_count": 150,
    "average_transaction": 300.00,
    "disputes_received": 3,
    "disputes_lost": 1
  },
  
  "current_balances": {
    "held_as_buyer": 1200.00,
    "held_as_seller": 8500.00,
    "available_for_payout": 5000.00
  },
  
  "trends": {
    "transactions_growth": 15.5,
    "volume_growth": 22.3,
    "dispute_rate": 2.0
  }
}
```

---

## 🗄️ Database Tables

### escrow_transactions
```sql
CREATE TABLE escrow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_number VARCHAR(50) UNIQUE NOT NULL,
  
  order_id UUID NOT NULL REFERENCES orders(id),
  
  buyer_id UUID NOT NULL REFERENCES users(id),
  seller_id UUID NOT NULL REFERENCES users(id),
  seller_type VARCHAR(20) DEFAULT 'vendor',
  
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  
  platform_fee DECIMAL(10,2) DEFAULT 0,
  processing_fee DECIMAL(10,2) DEFAULT 0,
  total_with_fees DECIMAL(10,2) NOT NULL,
  
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'held', 'released', 'refunded', 'disputed', 'cancelled')),
  
  payment_method_id UUID REFERENCES payment_methods(id),
  payment_transaction_id VARCHAR(100),
  
  auto_release BOOLEAN DEFAULT true,
  release_trigger VARCHAR(50),
  hold_days INT DEFAULT 7,
  dispute_window_days INT DEFAULT 7,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deposited_at TIMESTAMP,
  hold_until TIMESTAMP,
  released_at TIMESTAMP,
  refunded_at TIMESTAMP,
  disputed_at TIMESTAMP
);

CREATE INDEX idx_escrow_buyer ON escrow_transactions(buyer_id);
CREATE INDEX idx_escrow_seller ON escrow_transactions(seller_id);
CREATE INDEX idx_escrow_order ON escrow_transactions(order_id);
CREATE INDEX idx_escrow_status ON escrow_transactions(status);
```

### escrow_disputes
```sql
CREATE TABLE escrow_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_number VARCHAR(50) UNIQUE NOT NULL,
  
  escrow_transaction_id UUID NOT NULL REFERENCES escrow_transactions(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  
  opened_by UUID NOT NULL REFERENCES users(id),
  dispute_type VARCHAR(50) NOT NULL,
  
  description TEXT NOT NULL,
  evidence TEXT[],
  
  desired_outcome VARCHAR(50),
  requested_amount DECIMAL(10,2),
  
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'escalated', 'closed')),
  
  resolution_type VARCHAR(50),
  resolution_amount DECIMAL(10,2),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP,
  
  response_deadline TIMESTAMP,
  escalated_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### escrow_timeline
```sql
CREATE TABLE escrow_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_transaction_id UUID NOT NULL REFERENCES escrow_transactions(id) ON DELETE CASCADE,
  
  event VARCHAR(50) NOT NULL,
  description TEXT,
  
  amount DECIMAL(10,2),
  actor_id UUID REFERENCES users(id),
  
  metadata JSONB,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### payment_methods
```sql
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  
  type VARCHAR(20) NOT NULL CHECK (type IN ('credit_card', 'debit_card', 'bank_account', 'paypal')),
  
  -- Card details (encrypted)
  brand VARCHAR(20),
  last_4 VARCHAR(4),
  exp_month INT,
  exp_year INT,
  
  -- Bank details (encrypted)
  bank_name VARCHAR(100),
  account_type VARCHAR(20),
  routing_number_encrypted VARCHAR(255),
  account_number_encrypted VARCHAR(255),
  
  -- External IDs
  stripe_payment_method_id VARCHAR(100),
  paypal_email VARCHAR(255),
  
  billing_address JSONB,
  
  is_default BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_methods_user ON payment_methods(user_id);
```

---

## 🔐 Security Measures

### Payment Security
- PCI DSS compliance for card data
- Encrypt sensitive data at rest
- Use tokenization (Stripe, etc.)
- Never store full card numbers
- Secure API communication (HTTPS/TLS)

### Fraud Prevention
- Verify user identity
- Monitor suspicious patterns
- Implement velocity checks
- Use 3D Secure for cards
- Geographic restrictions

### Escrow Safety
- Multi-signature releases for large amounts
- Time locks on releases
- Audit trail for all actions
- Regular reconciliation
- Insurance/reserve fund

---

## 🎯 Business Rules

### Fees
- **Platform Fee:** 5% of transaction amount
- **Processing Fee:** 3% of transaction amount (Stripe/payment processor)
- **Total Fee:** 8% of transaction amount
- **Minimum Fee:** $0.50
- **Maximum Fee:** $500.00 per transaction

### Hold Periods
- **Standard:** 7 days after delivery
- **New Vendor:** 14 days after delivery
- **High Value (>$1000):** 10 days after delivery
- **Disputed:** Indefinite until resolution

### Auto-Release Conditions
1. **Delivery Confirmed:** Buyer confirms receipt
2. **Tracking Delivered + Time:** 3 days after tracking shows delivered
3. **Time-Based:** 7 days after estimated delivery if no issues
4. **Vendor Rating:** High-rated vendors (4.8+) get 5-day hold

### Refund Rules
- **Before Confirmation:** 100% refund (no fees)
- **Before Shipping:** 100% refund minus processing fee (3%)
- **After Shipping, Vendor Fault:** 100% refund
- **After Shipping, Buyer Fault:** Refund minus restocking (10%) and shipping

### Dispute Resolution
- **Response Time:** Vendor has 3 days to respond
- **Negotiation Period:** 7 days for parties to resolve
- **Escalation:** Admin review if unresolved
- **Admin Decision:** Final and binding

---

## 🎉 Summary

The **Escrow Routes** provide secure payment management with:

- ✅ **Secure Holding** - Funds protected until delivery
- ✅ **Automated Releases** - Trigger-based disbursement
- ✅ **Dispute Management** - Fair resolution process
- ✅ **Payment Methods** - Multiple payment options
- ✅ **Transaction History** - Complete audit trail
- ✅ **Fee Transparency** - Clear fee breakdown
- ✅ **Buyer Protection** - Refund guarantees
- ✅ **Vendor Security** - Guaranteed payment

All endpoints ensure safe transactions for everyone! 💰
