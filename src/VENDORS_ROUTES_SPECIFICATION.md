# 🏪 Vendors Routes Specification

## Overview

The **Vendors Routes** manage vendor profiles, storefronts, analytics, and vendor-specific operations for the "Save Together, Buy Smarter" bulk purchasing application. These routes enable vendors to manage their business presence, track performance, and interact with buyers.

---

## 🎯 What Vendors Routes Are For

In your bulk purchasing app, **Vendors** enable:

1. **Vendor Profiles** - Manage business information and storefront
2. **Product Management** - Centralized product catalog management
3. **Order Management** - Track and fulfill customer orders
4. **Analytics & Insights** - Business performance metrics
5. **Communication** - Interact with groups and customers
6. **Reputation** - Build trust through ratings and reviews
7. **Financial Management** - Track earnings and payouts

---

## 🏗️ Vendors Architecture

### Base Route
```
/api/vendors
```

### Authentication
- **Public Endpoints:** Browse vendors, view profiles
- **Authenticated:** Rate vendors, contact
- **Vendor Only:** Manage own profile, products, orders
- **Admin Only:** Approve/suspend vendors

---

## 📍 Complete Endpoint List

### Vendor Discovery (5 endpoints)
1. `GET /api/vendors` - List all vendors
2. `GET /api/vendors/:id` - Get vendor profile
3. `GET /api/vendors/search` - Search vendors
4. `GET /api/vendors/featured` - Get featured vendors
5. `GET /api/vendors/:id/products` - Get vendor's products

### Vendor Management - Vendor Only (6 endpoints)
6. `GET /api/vendors/me` - Get own vendor profile
7. `PUT /api/vendors/me` - Update vendor profile
8. `POST /api/vendors/register` - Apply to become vendor
9. `PUT /api/vendors/me/business-info` - Update business details
10. `POST /api/vendors/me/verify` - Submit verification documents
11. `DELETE /api/vendors/me` - Deactivate vendor account

### Vendor Orders - Vendor Only (4 endpoints)
12. `GET /api/vendors/me/orders` - Get vendor's orders
13. `GET /api/vendors/me/orders/:orderId` - Get order details
14. `PUT /api/vendors/me/orders/:orderId/status` - Update order status
15. `POST /api/vendors/me/orders/:orderId/shipping` - Add shipping info

### Vendor Analytics - Vendor Only (4 endpoints)
16. `GET /api/vendors/me/analytics` - Get vendor analytics
17. `GET /api/vendors/me/revenue` - Get revenue reports
18. `GET /api/vendors/me/performance` - Get performance metrics
19. `GET /api/vendors/me/insights` - Get business insights

### Vendor Reviews (4 endpoints)
20. `GET /api/vendors/:id/reviews` - Get vendor reviews
21. `POST /api/vendors/:id/reviews` - Add vendor review
22. `POST /api/vendors/:id/reviews/:reviewId/response` - Respond to review
23. `GET /api/vendors/me/reviews` - Get reviews for own business

### Vendor Financial - Vendor Only (3 endpoints)
24. `GET /api/vendors/me/wallet` - Get vendor wallet balance
25. `GET /api/vendors/me/transactions` - Get transaction history
26. `POST /api/vendors/me/payout` - Request payout

### Admin - Vendor Management (4 endpoints)
27. `GET /api/vendors/pending` - Get pending vendor applications (Admin)
28. `POST /api/vendors/:id/approve` - Approve vendor (Admin)
29. `POST /api/vendors/:id/suspend` - Suspend vendor (Admin)
30. `POST /api/vendors/:id/verify` - Verify vendor (Admin)

---

## 📖 Detailed Endpoint Specifications

---

### 1. GET /api/vendors

**Purpose:** List all vendors with filtering and sorting

**Authentication:** Not required (public)

**Query Parameters:**
- `status` (optional) - Filter by status: `active`, `verified`
- `category` (optional) - Filter by product category
- `min_rating` (optional) - Minimum rating (1-5)
- `verified_only` (optional, boolean) - Only verified vendors
- `has_products` (optional, boolean) - Only vendors with products
- `sort_by` (optional) - `rating`, `orders`, `newest`, `name`
- `order` (optional) - `asc`, `desc` (default: `desc`)
- `limit` (optional) - Results per page (default: 20)
- `offset` (optional) - Pagination offset

**Request Example:**
```http
GET /api/vendors?verified_only=true&min_rating=4&sort_by=rating&limit=20
```

**Response (200 OK):**
```json
{
  "vendors": [
    {
      "id": "uuid-vendor-1",
      "user_id": "uuid-user-1",
      "business_name": "Tech Supplies Co",
      "slug": "tech-supplies-co",
      "tagline": "Your trusted tech supplier",
      "description": "We provide high-quality tech products at bulk prices",
      "logo": "https://example.com/logos/tech-supplies.jpg",
      "banner": "https://example.com/banners/tech-supplies.jpg",
      
      "contact": {
        "email": "sales@techsupplies.com",
        "phone": "+1-555-0100",
        "website": "https://techsupplies.com"
      },
      
      "location": {
        "address": "123 Tech Street",
        "city": "San Francisco",
        "state": "CA",
        "country": "USA",
        "zip_code": "94105"
      },
      
      "rating": {
        "average": 4.8,
        "count": 256,
        "distribution": {
          "5": 200,
          "4": 40,
          "3": 10,
          "2": 4,
          "1": 2
        }
      },
      
      "statistics": {
        "total_products": 156,
        "active_products": 145,
        "total_orders": 1250,
        "completed_orders": 1200,
        "success_rate": 96.0,
        "average_response_time": 120,
        "on_time_delivery": 98.5
      },
      
      "badges": ["verified", "top_seller", "fast_responder"],
      "verified": true,
      "status": "active",
      "joined_date": "2024-06-15T00:00:00Z",
      "last_active": "2025-01-26T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0,
    "has_next": true,
    "has_prev": false
  }
}
```

**Business Logic:**

1. **Query Building:**
   - Select from vendors table
   - Join with users, vendor_reviews, vendor_statistics
   - Apply filters based on query parameters
   - Calculate aggregated statistics

2. **Filtering:**
   - Status: Only show 'active' vendors by default
   - Verified: Filter by verified = true
   - Rating: average_rating >= min_rating
   - Has products: vendors with active_products_count > 0

3. **Sorting:**
   - `rating`: Order by average_rating DESC
   - `orders`: Order by total_orders DESC
   - `newest`: Order by joined_date DESC
   - `name`: Order by business_name ASC

4. **Data Enrichment:**
   - Calculate rating statistics
   - Load performance metrics
   - Determine badges
   - Check verification status

**Vendor Badges:**
- `verified`: Vendor has been verified by admin
- `top_seller`: Total orders > 500
- `fast_responder`: Average response time < 60 minutes
- `highly_rated`: Average rating >= 4.5 with 50+ reviews
- `trusted`: Success rate >= 95% with 100+ orders

**Error Responses:**

**400 Bad Request:**
```json
{
  "error": "Invalid parameters",
  "details": {
    "sort_by": "Invalid sort field"
  }
}
```

---

### 2. GET /api/vendors/:id

**Purpose:** Get detailed vendor profile

**Authentication:** Not required (public)

**URL Parameters:**
- `id` - Vendor UUID or slug

**Query Parameters:**
- `include` (optional) - Comma-separated: `products,reviews,statistics,contact`

**Request Example:**
```http
GET /api/vendors/tech-supplies-co?include=products,reviews,statistics
```

**Response (200 OK):**
```json
{
  "id": "uuid-vendor-1",
  "user_id": "uuid-user-1",
  "business_name": "Tech Supplies Co",
  "slug": "tech-supplies-co",
  "tagline": "Your trusted tech supplier",
  "description": "We provide high-quality tech products at wholesale and bulk prices. With over 20 years of experience in the tech industry, we serve businesses of all sizes.",
  "long_description": "Detailed business story and information...",
  
  "logo": "https://example.com/logos/tech-supplies.jpg",
  "banner": "https://example.com/banners/tech-supplies.jpg",
  "images": [
    "https://example.com/gallery/warehouse.jpg",
    "https://example.com/gallery/office.jpg"
  ],
  
  "contact": {
    "email": "sales@techsupplies.com",
    "phone": "+1-555-0100",
    "website": "https://techsupplies.com",
    "support_hours": "Mon-Fri 9AM-6PM EST"
  },
  
  "location": {
    "address": "123 Tech Street",
    "city": "San Francisco",
    "state": "CA",
    "country": "USA",
    "zip_code": "94105",
    "coordinates": {
      "lat": 37.7749,
      "lng": -122.4194
    }
  },
  
  "business_info": {
    "legal_name": "Tech Supplies Corporation",
    "business_type": "Corporation",
    "tax_id": "XX-XXXXXXX",
    "registration_number": "CA-123456",
    "year_established": 2004
  },
  
  "rating": {
    "average": 4.8,
    "count": 256,
    "distribution": {
      "5": 200,
      "4": 40,
      "3": 10,
      "2": 4,
      "1": 2
    },
    "breakdown": {
      "product_quality": 4.9,
      "communication": 4.7,
      "shipping_speed": 4.8,
      "customer_service": 4.9
    }
  },
  
  "statistics": {
    "total_products": 156,
    "active_products": 145,
    "total_orders": 1250,
    "completed_orders": 1200,
    "cancelled_orders": 25,
    "success_rate": 96.0,
    "average_response_time": 120,
    "response_rate": 99.5,
    "on_time_delivery": 98.5,
    "total_revenue": 2500000.00,
    "repeat_customer_rate": 85.0
  },
  
  "categories": [
    {
      "id": "uuid-cat-1",
      "name": "Electronics",
      "product_count": 120
    },
    {
      "id": "uuid-cat-2",
      "name": "Office Supplies",
      "product_count": 36
    }
  ],
  
  "shipping_policies": {
    "free_shipping_threshold": 500.00,
    "default_shipping_cost": 25.00,
    "estimated_delivery": "5-7 business days",
    "ships_from": "California, USA",
    "international_shipping": true,
    "expedited_available": true
  },
  
  "return_policy": {
    "return_window": 30,
    "restocking_fee": 15.0,
    "conditions": "Items must be unopened and in original packaging"
  },
  
  "payment_methods": ["credit_card", "bank_transfer", "escrow"],
  
  "certifications": [
    {
      "name": "ISO 9001",
      "issued_by": "ISO",
      "issued_date": "2023-01-15"
    }
  ],
  
  "recent_products": [
    {
      "id": "uuid-product-1",
      "name": "Wireless Mouse Bulk Pack",
      "bulk_price": 15.99,
      "image": "https://...",
      "rating": 4.5
    }
  ],
  
  "recent_reviews": [
    {
      "id": "uuid-review-1",
      "user": {
        "name": "John Doe",
        "avatar": "https://..."
      },
      "rating": 5,
      "comment": "Excellent service and quality products!",
      "created_at": "2025-01-20T14:30:00Z"
    }
  ],
  
  "badges": ["verified", "top_seller", "fast_responder"],
  "verified": true,
  "verification_date": "2024-07-01T00:00:00Z",
  "status": "active",
  "joined_date": "2024-06-15T00:00:00Z",
  "last_active": "2025-01-26T10:00:00Z"
}
```

**Business Logic:**

1. **Vendor Lookup:**
   - Find by ID or slug
   - Verify status (show only 'active' unless admin)
   - Load basic vendor data

2. **Data Enrichment:**
   - Calculate comprehensive statistics
   - Load rating breakdown
   - Get recent products (5 most recent)
   - Get recent reviews (5 most recent)
   - Load categories vendor sells in

3. **Conditional Loading:**
   - `products`: Load recent/featured products
   - `reviews`: Load recent reviews with details
   - `statistics`: Load detailed performance metrics
   - `contact`: Include contact information

4. **Privacy:**
   - Hide sensitive business info (tax_id) from public
   - Show only necessary contact details
   - Admin sees all information

5. **View Tracking:**
   - Track profile views (async)
   - Update last_viewed timestamp

**Error Responses:**

**404 Not Found:**
```json
{
  "error": "Vendor not found",
  "message": "The requested vendor does not exist or is no longer active"
}
```

---

### 3. GET /api/vendors/search

**Purpose:** Search vendors by name, location, or category

**Authentication:** Not required (public)

**Query Parameters:**
- `q` (required) - Search query
- `location` (optional) - Filter by location
- `category` (optional) - Filter by product category
- `verified_only` (optional, boolean)
- `min_rating` (optional)
- `sort_by` (optional) - `relevance`, `rating`, `orders`
- `limit` (optional)
- `offset` (optional)

**Request Example:**
```http
GET /api/vendors/search?q=tech+supplies&verified_only=true
```

**Response (200 OK):**
```json
{
  "query": "tech supplies",
  "total_results": 15,
  "results": [
    {
      "id": "uuid-vendor-1",
      "business_name": "Tech Supplies Co",
      "slug": "tech-supplies-co",
      "description": "High-quality tech products...",
      "logo": "https://...",
      "rating": 4.8,
      "total_orders": 1250,
      "verified": true,
      "match_score": 0.95,
      "highlight": {
        "business_name": "<mark>Tech Supplies</mark> Co",
        "description": "High-quality <mark>tech</mark> products"
      }
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 20,
    "offset": 0
  }
}
```

**Business Logic:**
- Full-text search on business_name, description, tags
- Use PostgreSQL tsvector
- Rank by relevance, rating, orders
- Highlight matching terms

---

### 6. GET /api/vendors/me

**Purpose:** Get own vendor profile (authenticated vendor)

**Authentication:** Required (Vendor role)

**Response (200 OK):**
```json
{
  "id": "uuid-vendor-1",
  "user_id": "uuid-user-1",
  "business_name": "Tech Supplies Co",
  // ... all vendor profile fields
  
  "private_info": {
    "tax_id": "XX-XXXXXXX",
    "bank_account": {
      "account_holder": "Tech Supplies Corp",
      "bank_name": "Chase Bank",
      "account_last_4": "1234",
      "routing_number": "XXXXX6789"
    },
    "payout_method": "bank_transfer",
    "payout_schedule": "weekly"
  },
  
  "application_status": "approved",
  "verification_status": "verified",
  "verification_documents": [
    {
      "type": "business_license",
      "status": "approved",
      "submitted_at": "2024-06-20T10:00:00Z"
    }
  ],
  
  "account_health": {
    "status": "good",
    "warnings": [],
    "restrictions": []
  },
  
  "dashboard_stats": {
    "today_revenue": 1250.50,
    "pending_orders": 8,
    "new_reviews": 3,
    "messages_unread": 5,
    "low_stock_products": 2
  }
}
```

**Business Logic:**
- Return full vendor profile including private info
- Include application/verification status
- Show account health and warnings
- Provide dashboard metrics

---

### 7. PUT /api/vendors/me

**Purpose:** Update own vendor profile

**Authentication:** Required (Vendor role)

**Request Body (all fields optional):**
```json
{
  "business_name": "Tech Supplies Co",
  "tagline": "Updated tagline",
  "description": "Updated description",
  "logo": "https://new-logo.jpg",
  "banner": "https://new-banner.jpg",
  "contact": {
    "email": "newsales@techsupplies.com",
    "phone": "+1-555-0101",
    "website": "https://techsupplies.com"
  },
  "location": {
    "address": "456 New Street",
    "city": "San Francisco",
    "state": "CA",
    "country": "USA",
    "zip_code": "94105"
  },
  "shipping_policies": {
    "free_shipping_threshold": 600.00,
    "estimated_delivery": "3-5 business days"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Vendor profile updated successfully",
  "vendor": {
    // updated vendor details
    "updated_at": "2025-01-26T15:00:00Z"
  }
}
```

**Business Logic:**

1. **Validation:**
   - Validate business_name is unique
   - Validate email format
   - Validate phone format
   - Validate URLs

2. **Update:**
   - Update only provided fields
   - Maintain audit trail
   - Update updated_at timestamp

3. **Notifications:**
   - If business_name changes, notify followers
   - If contact changes, verify new email

**Error Responses:**

**400 Bad Request:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "business_name",
      "message": "Business name already taken"
    }
  ]
}
```

---

### 8. POST /api/vendors/register

**Purpose:** Apply to become a vendor

**Authentication:** Required (Member role)

**Request Body:**
```json
{
  "business_name": "Tech Supplies Co",
  "business_type": "Corporation",
  "legal_name": "Tech Supplies Corporation",
  "tax_id": "XX-XXXXXXX",
  "registration_number": "CA-123456",
  "description": "We provide high-quality tech products",
  "contact": {
    "email": "sales@techsupplies.com",
    "phone": "+1-555-0100",
    "website": "https://techsupplies.com"
  },
  "location": {
    "address": "123 Tech Street",
    "city": "San Francisco",
    "state": "CA",
    "country": "USA",
    "zip_code": "94105"
  },
  "categories": ["electronics", "office-supplies"],
  "estimated_monthly_volume": "10000-50000",
  "business_documents": [
    {
      "type": "business_license",
      "url": "https://storage.com/license.pdf"
    },
    {
      "type": "tax_certificate",
      "url": "https://storage.com/tax-cert.pdf"
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Vendor application submitted successfully",
  "application": {
    "id": "uuid-application-1",
    "vendor_id": "uuid-vendor-1",
    "status": "pending",
    "submitted_at": "2025-01-26T16:00:00Z",
    "estimated_review_time": "3-5 business days"
  },
  "vendor": {
    "id": "uuid-vendor-1",
    "business_name": "Tech Supplies Co",
    "status": "pending_approval"
  }
}
```

**Business Logic:**

1. **Pre-requisites:**
   - User must not already be a vendor
   - User account must be verified

2. **Validation:**
   - Validate all required fields
   - Check business_name is unique
   - Validate tax_id format
   - Verify business documents uploaded

3. **Vendor Creation:**
   - Create vendor record with status = 'pending'
   - Link to user account
   - Update user role = 'vendor' (inactive until approved)
   - Generate vendor_id

4. **Application Process:**
   - Create vendor_application record
   - Store submitted documents
   - Set review deadline (3-5 business days)

5. **Notifications:**
   - Notify admin of new application
   - Send confirmation email to applicant
   - Provide application tracking info

**Error Responses:**

**400 Bad Request:**
```json
{
  "error": "Already a vendor",
  "message": "Your account is already registered as a vendor",
  "vendor_id": "uuid-vendor-1"
}
```

**400 Bad Request:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "tax_id",
      "message": "Invalid tax ID format"
    }
  ]
}
```

---

### 12. GET /api/vendors/me/orders

**Purpose:** Get vendor's orders

**Authentication:** Required (Vendor role)

**Query Parameters:**
- `status` (optional) - Filter by status: `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`
- `group_id` (optional) - Filter by group
- `date_from` (optional) - Start date
- `date_to` (optional) - End date
- `sort_by` (optional) - `date`, `amount`, `status`
- `order` (optional) - `asc`, `desc`
- `limit` (optional)
- `offset` (optional)

**Request Example:**
```http
GET /api/vendors/me/orders?status=processing&sort_by=date&order=desc
```

**Response (200 OK):**
```json
{
  "orders": [
    {
      "id": "uuid-order-1",
      "order_number": "ORD-2025-001234",
      "group": {
        "id": "uuid-group-1",
        "name": "Tech Enthusiasts",
        "admin": {
          "name": "John Doe",
          "email": "john@example.com"
        }
      },
      "product": {
        "id": "uuid-product-1",
        "name": "Wireless Mouse Bulk Pack",
        "image": "https://..."
      },
      "quantity": 25,
      "price_per_unit": 15.99,
      "total_amount": 399.75,
      "status": "processing",
      "payment_status": "escrow",
      "participants_count": 8,
      "shipping": {
        "address": "123 Main St, San Francisco, CA 94105",
        "method": "Standard",
        "tracking_number": null,
        "estimated_delivery": "2025-02-10T00:00:00Z"
      },
      "created_at": "2025-01-25T14:00:00Z",
      "confirmed_at": "2025-01-25T16:00:00Z",
      "deadline": "2025-02-08T00:00:00Z",
      "notes": "Please ship to office address"
    }
  ],
  "summary": {
    "total": 45,
    "by_status": {
      "pending": 5,
      "processing": 8,
      "shipped": 12,
      "delivered": 18,
      "cancelled": 2
    },
    "total_revenue": 15000.50,
    "pending_revenue": 2500.00
  },
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0
  }
}
```

**Business Logic:**
- Query orders for vendor's products
- Apply filters
- Include group and product details
- Calculate summary statistics
- Show payment/escrow status

---

### 13. GET /api/vendors/me/orders/:orderId

**Purpose:** Get detailed order information

**Authentication:** Required (Vendor role)

**Response (200 OK):**
```json
{
  "id": "uuid-order-1",
  "order_number": "ORD-2025-001234",
  
  "group": {
    "id": "uuid-group-1",
    "name": "Tech Enthusiasts",
    "admin": {
      "id": "uuid-user-1",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1-555-0100"
    },
    "member_count": 12
  },
  
  "product": {
    "id": "uuid-product-1",
    "name": "Wireless Mouse Bulk Pack",
    "sku": "WM-BULK-20",
    "image": "https://...",
    "specifications": {
      "color": "Black",
      "brand": "TechMouse"
    }
  },
  
  "pricing": {
    "quantity": 25,
    "price_per_unit": 15.99,
    "subtotal": 399.75,
    "shipping": 25.00,
    "tax": 35.98,
    "total": 460.73
  },
  
  "participants": [
    {
      "user_id": "uuid-user-1",
      "name": "John Doe",
      "quantity": 5,
      "amount": 79.95
    },
    {
      "user_id": "uuid-user-2",
      "name": "Jane Smith",
      "quantity": 10,
      "amount": 159.90
    }
  ],
  
  "shipping": {
    "recipient_name": "John Doe",
    "address": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zip_code": "94105",
    "country": "USA",
    "phone": "+1-555-0100",
    "method": "Standard Shipping",
    "tracking_number": "TRACK123456",
    "carrier": "UPS",
    "estimated_delivery": "2025-02-10T00:00:00Z",
    "shipped_date": "2025-01-28T10:00:00Z"
  },
  
  "payment": {
    "status": "escrow",
    "method": "escrow",
    "escrow_id": "uuid-escrow-1",
    "amount_held": 460.73,
    "release_date": "2025-02-15T00:00:00Z"
  },
  
  "status": "processing",
  "timeline": [
    {
      "status": "created",
      "timestamp": "2025-01-25T14:00:00Z",
      "note": "Order created by group admin"
    },
    {
      "status": "confirmed",
      "timestamp": "2025-01-25T16:00:00Z",
      "note": "All participants confirmed"
    },
    {
      "status": "paid",
      "timestamp": "2025-01-25T17:00:00Z",
      "note": "Payment received in escrow"
    },
    {
      "status": "processing",
      "timestamp": "2025-01-26T09:00:00Z",
      "note": "Vendor confirmed and preparing order"
    }
  ],
  
  "notes": "Please ship to office address during business hours",
  "internal_notes": "Customer requests gift wrapping",
  
  "created_at": "2025-01-25T14:00:00Z",
  "confirmed_at": "2025-01-25T16:00:00Z",
  "deadline": "2025-02-08T00:00:00Z"
}
```

**Business Logic:**
- Verify order belongs to vendor
- Load complete order details
- Include all participants
- Show payment/escrow status
- Display timeline
- Include shipping information

---

### 14. PUT /api/vendors/me/orders/:orderId/status

**Purpose:** Update order status

**Authentication:** Required (Vendor role)

**Request Body:**
```json
{
  "status": "shipped",
  "note": "Order has been shipped via UPS"
}
```

**Status Workflow:**
```
pending → confirmed → processing → shipped → delivered
         ↓
      cancelled
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Order status updated to shipped",
  "order": {
    "id": "uuid-order-1",
    "status": "shipped",
    "updated_at": "2025-01-28T10:00:00Z"
  }
}
```

**Business Logic:**

1. **Authorization:**
   - Verify order belongs to vendor
   - Check current status allows transition

2. **Status Validation:**
   - Validate status transition is allowed
   - `pending` → `confirmed` (vendor accepts)
   - `confirmed` → `processing` (vendor preparing)
   - `processing` → `shipped` (order shipped)
   - `shipped` → `delivered` (customer received)
   - Any → `cancelled` (with reason)

3. **Status-Specific Actions:**

   **confirmed:**
   - Vendor accepts order
   - Reserve inventory
   - Notify group admin

   **processing:**
   - Start preparing order
   - Update estimated delivery
   - Notify participants

   **shipped:**
   - Require tracking number
   - Update delivery estimate
   - Notify all participants
   - Start delivery countdown

   **delivered:**
   - Confirm delivery
   - Trigger escrow release
   - Request review
   - Complete order

   **cancelled:**
   - Require cancellation reason
   - Release inventory
   - Refund escrow
   - Notify participants
   - Log cancellation

4. **Timeline Update:**
   - Add status change to timeline
   - Record timestamp and note
   - Log who made the change

5. **Notifications:**
   - Notify group admin
   - Notify all participants
   - Send status-specific messages

**Error Responses:**

**400 Bad Request:**
```json
{
  "error": "Invalid status transition",
  "message": "Cannot change from 'pending' to 'shipped'. Must go through 'confirmed' and 'processing' first.",
  "current_status": "pending",
  "allowed_transitions": ["confirmed", "cancelled"]
}
```

**400 Bad Request - Missing Requirements:**
```json
{
  "error": "Missing required information",
  "message": "Tracking number is required to mark order as shipped",
  "missing_fields": ["tracking_number"]
}
```

---

### 15. POST /api/vendors/me/orders/:orderId/shipping

**Purpose:** Add or update shipping information

**Authentication:** Required (Vendor role)

**Request Body:**
```json
{
  "tracking_number": "TRACK123456",
  "carrier": "UPS",
  "shipping_method": "Standard Ground",
  "estimated_delivery": "2025-02-10T00:00:00Z",
  "shipping_cost": 25.00,
  "notes": "Signature required upon delivery"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Shipping information updated",
  "shipping": {
    "tracking_number": "TRACK123456",
    "carrier": "UPS",
    "tracking_url": "https://www.ups.com/track?tracknum=TRACK123456",
    "estimated_delivery": "2025-02-10T00:00:00Z",
    "updated_at": "2025-01-28T10:00:00Z"
  }
}
```

**Business Logic:**
- Update shipping information
- Generate tracking URL
- Automatically update order status to 'shipped' if not already
- Notify all participants with tracking info
- Send tracking link email

---

### 16. GET /api/vendors/me/analytics

**Purpose:** Get comprehensive vendor analytics

**Authentication:** Required (Vendor role)

**Query Parameters:**
- `period` (optional) - `day`, `week`, `month`, `year`, `all_time` (default: `month`)
- `compare` (optional, boolean) - Compare with previous period

**Request Example:**
```http
GET /api/vendors/me/analytics?period=month&compare=true
```

**Response (200 OK):**
```json
{
  "period": "month",
  "date_range": {
    "start": "2025-01-01T00:00:00Z",
    "end": "2025-01-31T23:59:59Z"
  },
  
  "summary": {
    "total_revenue": 125000.50,
    "total_orders": 156,
    "average_order_value": 801.29,
    "total_products_sold": 3420,
    "new_customers": 45,
    "repeat_customers": 89
  },
  
  "comparison": {
    "revenue_change": 15.5,
    "orders_change": 12.3,
    "customers_change": 8.7,
    "trend": "up"
  },
  
  "revenue": {
    "by_day": [
      {
        "date": "2025-01-01",
        "revenue": 4250.00,
        "orders": 5
      }
    ],
    "by_product": [
      {
        "product_id": "uuid-product-1",
        "product_name": "Wireless Mouse",
        "revenue": 15000.00,
        "quantity_sold": 750,
        "orders": 45
      }
    ],
    "by_category": [
      {
        "category": "Electronics",
        "revenue": 85000.00,
        "percentage": 68.0
      }
    ]
  },
  
  "orders": {
    "by_status": {
      "completed": 120,
      "processing": 25,
      "shipped": 8,
      "cancelled": 3
    },
    "cancellation_rate": 1.9,
    "completion_rate": 98.1
  },
  
  "customers": {
    "total_unique": 134,
    "new": 45,
    "returning": 89,
    "retention_rate": 66.4,
    "by_location": [
      {
        "state": "CA",
        "count": 45
      },
      {
        "state": "NY",
        "count": 32
      }
    ]
  },
  
  "products": {
    "total_views": 8540,
    "views_to_orders": 1.8,
    "conversion_rate": 4.2,
    "top_performing": [
      {
        "product_id": "uuid-product-1",
        "name": "Wireless Mouse",
        "views": 1250,
        "orders": 45,
        "revenue": 15000.00,
        "conversion_rate": 3.6
      }
    ],
    "low_performing": [
      {
        "product_id": "uuid-product-10",
        "name": "USB Cable",
        "views": 450,
        "orders": 2,
        "conversion_rate": 0.4
      }
    ]
  },
  
  "performance": {
    "average_rating": 4.8,
    "new_reviews": 15,
    "response_time": 85,
    "response_rate": 99.2,
    "on_time_delivery": 98.5,
    "order_accuracy": 99.1
  },
  
  "traffic": {
    "profile_views": 2540,
    "product_views": 8540,
    "search_appearances": 1250,
    "sources": {
      "search": 3500,
      "direct": 2800,
      "groups": 1240,
      "recommendations": 1000
    }
  }
}
```

**Business Logic:**

1. **Time Period Handling:**
   - Calculate date range based on period
   - Get comparison period (previous month, etc.)
   - Aggregate data for period

2. **Revenue Analytics:**
   - Sum total revenue
   - Break down by day/week/month
   - Analyze by product and category
   - Calculate trends

3. **Order Analytics:**
   - Count orders by status
   - Calculate completion/cancellation rates
   - Analyze order patterns

4. **Customer Analytics:**
   - Count unique customers
   - Identify new vs returning
   - Calculate retention rate
   - Geographic analysis

5. **Product Performance:**
   - Track views and conversions
   - Identify top performers
   - Flag low performers
   - Calculate conversion rates

6. **Performance Metrics:**
   - Average rating
   - Response time/rate
   - Delivery performance
   - Order accuracy

---

### 17. GET /api/vendors/me/revenue

**Purpose:** Get detailed revenue reports

**Authentication:** Required (Vendor role)

**Query Parameters:**
- `period` (optional) - `day`, `week`, `month`, `year`, `custom`
- `start_date` (optional) - For custom period
- `end_date` (optional) - For custom period
- `granularity` (optional) - `hour`, `day`, `week`, `month`

**Response (200 OK):**
```json
{
  "period": "month",
  "total_revenue": 125000.50,
  "total_orders": 156,
  
  "breakdown": {
    "gross_revenue": 125000.50,
    "platform_fees": 6250.03,
    "processing_fees": 3625.02,
    "refunds": 1250.00,
    "net_revenue": 113875.45
  },
  
  "timeline": [
    {
      "date": "2025-01-01",
      "revenue": 4250.00,
      "orders": 5,
      "average_order": 850.00
    }
  ],
  
  "top_products": [
    {
      "product_id": "uuid-product-1",
      "name": "Wireless Mouse",
      "revenue": 15000.00,
      "quantity": 750,
      "percentage": 12.0
    }
  ],
  
  "pending_payouts": {
    "amount": 45000.00,
    "orders_count": 55,
    "oldest_order": "2025-01-15T00:00:00Z"
  },
  
  "completed_payouts": {
    "amount": 68875.45,
    "payouts_count": 4,
    "last_payout": "2025-01-25T00:00:00Z"
  }
}
```

---

### 20. GET /api/vendors/:id/reviews

**Purpose:** Get reviews for a vendor

**Authentication:** Not required (public)

**Query Parameters:**
- `rating` (optional) - Filter by rating
- `verified_only` (optional, boolean)
- `sort_by` (optional) - `recent`, `helpful`, `rating_high`, `rating_low`
- `limit` (optional)
- `offset` (optional)

**Response (200 OK):**
```json
{
  "vendor_id": "uuid-vendor-1",
  "rating_summary": {
    "average": 4.8,
    "count": 256,
    "distribution": {
      "5": 200,
      "4": 40,
      "3": 10,
      "2": 4,
      "1": 2
    },
    "breakdown": {
      "product_quality": 4.9,
      "communication": 4.7,
      "shipping_speed": 4.8,
      "customer_service": 4.9
    }
  },
  "reviews": [
    {
      "id": "uuid-review-1",
      "user": {
        "id": "uuid-user-1",
        "name": "John Doe",
        "avatar": "https://...",
        "verified_buyer": true
      },
      "rating": 5,
      "breakdown": {
        "product_quality": 5,
        "communication": 5,
        "shipping_speed": 5,
        "customer_service": 5
      },
      "title": "Excellent vendor!",
      "comment": "Great products, fast shipping, and excellent customer service. Highly recommend!",
      "order_id": "uuid-order-1",
      "helpful_count": 25,
      "verified_purchase": true,
      "vendor_response": {
        "comment": "Thank you for your kind words!",
        "responded_at": "2025-01-21T10:00:00Z"
      },
      "created_at": "2025-01-20T14:30:00Z"
    }
  ],
  "pagination": {
    "total": 256,
    "limit": 20,
    "offset": 0
  }
}
```

---

### 21. POST /api/vendors/:id/reviews

**Purpose:** Add a review for a vendor (must have purchased)

**Authentication:** Required

**Request Body:**
```json
{
  "order_id": "uuid-order-1",
  "rating": 5,
  "breakdown": {
    "product_quality": 5,
    "communication": 5,
    "shipping_speed": 5,
    "customer_service": 5
  },
  "title": "Excellent vendor!",
  "comment": "Great products and service"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Review submitted successfully",
  "review": {
    "id": "uuid-new-review",
    // review details
  }
}
```

**Business Logic:**
- Verify user has completed order with vendor
- One review per order
- Calculate overall rating from breakdown
- Update vendor's average rating
- Notify vendor of new review

---

### 24. GET /api/vendors/me/wallet

**Purpose:** Get vendor wallet balance and details

**Authentication:** Required (Vendor role)

**Response (200 OK):**
```json
{
  "wallet_id": "uuid-wallet-1",
  "balance": {
    "available": 25000.50,
    "pending": 45000.00,
    "total": 70000.50,
    "currency": "USD"
  },
  "pending_breakdown": {
    "in_escrow": 40000.00,
    "processing_orders": 5000.00
  },
  "lifetime_earnings": 500000.00,
  "total_withdrawn": 430000.00,
  "payout_settings": {
    "method": "bank_transfer",
    "schedule": "weekly",
    "minimum_amount": 100.00,
    "next_payout_date": "2025-02-01T00:00:00Z"
  }
}
```

---

### 26. POST /api/vendors/me/payout

**Purpose:** Request a payout

**Authentication:** Required (Vendor role)

**Request Body:**
```json
{
  "amount": 25000.50,
  "method": "bank_transfer",
  "notes": "Monthly payout request"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Payout request submitted",
  "payout": {
    "id": "uuid-payout-1",
    "amount": 25000.50,
    "method": "bank_transfer",
    "status": "pending",
    "estimated_arrival": "2025-02-03T00:00:00Z",
    "requested_at": "2025-01-26T16:00:00Z"
  }
}
```

**Business Logic:**
- Verify sufficient available balance
- Check minimum payout amount
- Create payout request
- Deduct from available balance
- Process payout (external service)
- Update status when complete

---

### 27. GET /api/vendors/pending (Admin Only)

**Purpose:** Get pending vendor applications

**Authentication:** Required (Admin role)

**Response (200 OK):**
```json
{
  "applications": [
    {
      "id": "uuid-application-1",
      "vendor_id": "uuid-vendor-1",
      "user": {
        "id": "uuid-user-1",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "business_name": "Tech Supplies Co",
      "business_type": "Corporation",
      "status": "pending",
      "submitted_at": "2025-01-20T10:00:00Z",
      "documents": [
        {
          "type": "business_license",
          "url": "https://...",
          "status": "pending_review"
        }
      ]
    }
  ],
  "total": 5
}
```

---

### 28. POST /api/vendors/:id/approve (Admin Only)

**Purpose:** Approve vendor application

**Authentication:** Required (Admin role)

**Request Body:**
```json
{
  "notes": "All documents verified",
  "verified": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Vendor approved successfully",
  "vendor": {
    "id": "uuid-vendor-1",
    "status": "active",
    "verified": true,
    "approved_at": "2025-01-26T16:00:00Z"
  }
}
```

**Business Logic:**
- Update vendor status to 'active'
- Optionally set verified = true
- Notify vendor of approval
- Grant vendor permissions
- Log approval

---

## 🗄️ Database Tables

### vendors
```sql
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id),
  business_name VARCHAR(200) NOT NULL,
  slug VARCHAR(250) UNIQUE NOT NULL,
  tagline VARCHAR(500),
  description TEXT,
  long_description TEXT,
  logo VARCHAR(500),
  banner VARCHAR(500),
  
  -- Contact
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  website VARCHAR(500),
  
  -- Location
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  zip_code VARCHAR(20),
  
  -- Business Info
  legal_name VARCHAR(200),
  business_type VARCHAR(50),
  tax_id VARCHAR(50),
  registration_number VARCHAR(100),
  year_established INT,
  
  -- Statistics
  total_products INT DEFAULT 0,
  active_products INT DEFAULT 0,
  total_orders INT DEFAULT 0,
  completed_orders INT DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  reviews_count INT DEFAULT 0,
  average_response_time INT DEFAULT 0,
  on_time_delivery_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'inactive')),
  verified BOOLEAN DEFAULT false,
  verification_date TIMESTAMP,
  
  -- Timestamps
  joined_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_active TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vendors_user ON vendors(user_id);
CREATE INDEX idx_vendors_slug ON vendors(slug);
CREATE INDEX idx_vendors_status ON vendors(status);
CREATE INDEX idx_vendors_rating ON vendors(average_rating);
```

### vendor_reviews
```sql
CREATE TABLE vendor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  order_id UUID REFERENCES orders(id),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  product_quality_rating INT CHECK (product_quality_rating >= 1 AND product_quality_rating <= 5),
  communication_rating INT CHECK (communication_rating >= 1 AND communication_rating <= 5),
  shipping_speed_rating INT CHECK (shipping_speed_rating >= 1 AND shipping_speed_rating <= 5),
  customer_service_rating INT CHECK (customer_service_rating >= 1 AND customer_service_rating <= 5),
  title VARCHAR(200),
  comment TEXT,
  verified_purchase BOOLEAN DEFAULT false,
  helpful_count INT DEFAULT 0,
  vendor_response TEXT,
  vendor_response_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(vendor_id, order_id)
);
```

### vendor_applications
```sql
CREATE TABLE vendor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  user_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by UUID REFERENCES users(id),
  review_notes TEXT,
  documents JSONB
);
```

---

## 🎉 Summary

The **Vendors Routes** provide complete vendor management with:

- ✅ **Vendor Discovery** - Browse, search vendors
- ✅ **Profile Management** - Complete business profiles
- ✅ **Order Management** - Track and fulfill orders
- ✅ **Analytics** - Revenue, performance metrics
- ✅ **Reviews** - Build reputation and trust
- ✅ **Financial** - Wallet, payouts, transactions
- ✅ **Application Process** - Onboarding workflow
- ✅ **Admin Controls** - Approval, verification, suspension

All endpoints support the vendor ecosystem! 🏪
