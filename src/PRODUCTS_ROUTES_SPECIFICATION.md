# 🛍️ Products Routes Specification

## Overview

The **Products Routes** manage the product catalog for the "Save Together, Buy Smarter" bulk purchasing application. These routes enable users to browse products, view bulk pricing, search for items, and vendors to manage their product listings.

---

## 🎯 What Products Routes Are For

In your bulk purchasing app, **Products** enable:

1. **Product Discovery** - Browse and search available bulk products
2. **Bulk Pricing** - View quantity-based pricing tiers
3. **Vendor Catalogs** - Manage vendor product listings
4. **Product Details** - Detailed information, specs, and reviews
5. **Wishlist Management** - Save products for later
6. **Price Comparison** - Compare bulk vs retail pricing
7. **Inventory Tracking** - Monitor product availability

---

## 🏗️ Products Architecture

### Base Route
```
/api/products
```

### Authentication
- **Public Endpoints:** Browse, search, view products
- **Authenticated:** Wishlist, reviews, vendor management
- **Vendor Only:** Create, update, delete products

---

## 📍 Complete Endpoint List

### Product Browsing (6 endpoints)
1. `GET /api/products` - List all products with filters
2. `GET /api/products/:id` - Get specific product details
3. `GET /api/products/search` - Search products
4. `GET /api/products/trending` - Get trending products
5. `GET /api/products/featured` - Get featured products
6. `GET /api/products/recommendations` - Get personalized recommendations

### Product Management - Vendor Only (5 endpoints)
7. `POST /api/products` - Create new product
8. `PUT /api/products/:id` - Update product
9. `DELETE /api/products/:id` - Delete product
10. `PATCH /api/products/:id/stock` - Update stock quantity
11. `PATCH /api/products/:id/status` - Change product status

### Product Categories (3 endpoints)
12. `GET /api/products/categories` - List all categories
13. `GET /api/products/categories/:slug` - Get products by category
14. `GET /api/products/categories/:slug/subcategories` - Get subcategories

### Product Reviews (5 endpoints)
15. `GET /api/products/:id/reviews` - Get product reviews
16. `POST /api/products/:id/reviews` - Add review (authenticated)
17. `PUT /api/products/:id/reviews/:reviewId` - Update own review
18. `DELETE /api/products/:id/reviews/:reviewId` - Delete own review
19. `POST /api/products/:id/reviews/:reviewId/helpful` - Mark review helpful

### Wishlist (4 endpoints)
20. `GET /api/products/wishlist` - Get user's wishlist
21. `POST /api/products/wishlist` - Add product to wishlist
22. `DELETE /api/products/wishlist/:productId` - Remove from wishlist
23. `POST /api/products/wishlist/check` - Check if products in wishlist

### Product Analytics (3 endpoints)
24. `GET /api/products/:id/analytics` - Get product analytics (vendor)
25. `GET /api/products/:id/price-history` - Get price history
26. `POST /api/products/:id/view` - Track product view

---

## 📖 Detailed Endpoint Specifications

---

### 1. GET /api/products

**Purpose:** List all products with filtering, sorting, and pagination

**Authentication:** Not required (public)

**Query Parameters:**
- `category` (optional) - Filter by category slug
- `vendor_id` (optional) - Filter by vendor
- `min_price` (optional) - Minimum price
- `max_price` (optional) - Maximum price
- `in_stock` (optional, boolean) - Only in-stock products
- `bulk_only` (optional, boolean) - Only products with bulk pricing
- `min_quantity` (optional) - Minimum order quantity filter
- `rating` (optional) - Minimum rating (1-5)
- `verified_vendor` (optional, boolean) - Only verified vendors
- `sort_by` (optional) - Sort field: `price`, `rating`, `popularity`, `newest`, `savings`
- `order` (optional) - Sort order: `asc`, `desc` (default: `asc`)
- `limit` (optional) - Results per page (default: 20, max: 100)
- `offset` (optional) - Pagination offset (default: 0)

**Request Example:**
```http
GET /api/products?category=electronics&in_stock=true&sort_by=price&order=asc&limit=20
```

**Response (200 OK):**
```json
{
  "products": [
    {
      "id": "uuid-product-1",
      "name": "Wireless Mouse - Bulk Pack of 20",
      "slug": "wireless-mouse-bulk-pack-20",
      "description": "High-quality wireless mouse perfect for offices",
      "category": {
        "id": "uuid-cat-1",
        "name": "Electronics",
        "slug": "electronics"
      },
      "vendor": {
        "id": "uuid-vendor-1",
        "name": "Tech Supplies Co",
        "verified": true,
        "rating": 4.8,
        "response_time": 120
      },
      "images": [
        "https://example.com/images/mouse-1.jpg",
        "https://example.com/images/mouse-2.jpg"
      ],
      "pricing": {
        "retail_price": 25.99,
        "bulk_price": 15.99,
        "currency": "USD",
        "minimum_quantity": 20,
        "savings_per_unit": 10.00,
        "savings_percentage": 38.5,
        "price_tiers": [
          {
            "min_quantity": 20,
            "max_quantity": 49,
            "price": 15.99
          },
          {
            "min_quantity": 50,
            "max_quantity": 99,
            "price": 14.99
          },
          {
            "min_quantity": 100,
            "max_quantity": null,
            "price": 13.99
          }
        ]
      },
      "stock": {
        "available": true,
        "quantity": 500,
        "reserved": 50,
        "available_quantity": 450
      },
      "specifications": {
        "brand": "TechMouse",
        "color": "Black",
        "wireless": true,
        "battery_type": "AA"
      },
      "rating": {
        "average": 4.5,
        "count": 128,
        "distribution": {
          "5": 80,
          "4": 30,
          "3": 10,
          "2": 5,
          "1": 3
        }
      },
      "stats": {
        "views": 1250,
        "orders": 45,
        "wishlisted": 89
      },
      "badges": ["bulk_deal", "fast_shipping", "verified_vendor"],
      "status": "active",
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-01-26T08:00:00Z"
    }
  ],
  "pagination": {
    "total": 250,
    "limit": 20,
    "offset": 0,
    "has_next": true,
    "has_prev": false
  },
  "filters_applied": {
    "category": "electronics",
    "in_stock": true,
    "sort_by": "price",
    "order": "asc"
  }
}
```

**Business Logic:**

1. **Query Building:**
   - Start with base query selecting from products table
   - Join with vendors, categories tables
   - Apply filters based on query parameters
   - Calculate savings (retail_price - bulk_price)

2. **Filtering:**
   - Category: Match category_id or category slug
   - Price range: bulk_price BETWEEN min_price AND max_price
   - Stock: available = true AND quantity > 0
   - Rating: average_rating >= rating
   - Verified: vendors.verified = true

3. **Sorting:**
   - `price`: Order by bulk_price
   - `rating`: Order by average_rating DESC
   - `popularity`: Order by views + (orders * 10)
   - `newest`: Order by created_at DESC
   - `savings`: Order by (retail_price - bulk_price) DESC

4. **Pagination:**
   - Apply LIMIT and OFFSET
   - Calculate total count (separate query or COUNT(*) OVER())
   - Determine has_next and has_prev

5. **Data Enrichment:**
   - Load product images
   - Calculate price tiers
   - Load vendor info with rating
   - Calculate savings percentage
   - Determine badges

**Performance Optimization:**
- Index on: category_id, vendor_id, bulk_price, status, created_at
- Cache popular queries (30 minutes)
- Use database views for complex calculations
- Implement pagination efficiently

**Error Responses:**

**400 Bad Request:**
```json
{
  "error": "Invalid parameters",
  "details": {
    "sort_by": "Invalid sort field. Allowed: price, rating, popularity, newest, savings"
  }
}
```

---

### 2. GET /api/products/:id

**Purpose:** Get detailed information about a specific product

**Authentication:** Not required (public)

**URL Parameters:**
- `id` - Product UUID or slug

**Query Parameters:**
- `include` (optional) - Comma-separated: `vendor,reviews,related,analytics`

**Request Example:**
```http
GET /api/products/uuid-product-1?include=vendor,reviews,related
```

**Response (200 OK):**
```json
{
  "id": "uuid-product-1",
  "name": "Wireless Mouse - Bulk Pack of 20",
  "slug": "wireless-mouse-bulk-pack-20",
  "description": "High-quality wireless mouse perfect for offices and bulk buyers. Ergonomic design, long battery life, and reliable wireless connection.",
  "long_description": "This wireless mouse is designed for comfort and productivity...",
  
  "category": {
    "id": "uuid-cat-1",
    "name": "Electronics",
    "slug": "electronics",
    "parent": {
      "id": "uuid-cat-parent",
      "name": "Tech Accessories",
      "slug": "tech-accessories"
    }
  },
  
  "vendor": {
    "id": "uuid-vendor-1",
    "name": "Tech Supplies Co",
    "description": "Your trusted tech supplier",
    "logo": "https://...",
    "verified": true,
    "rating": 4.8,
    "total_products": 156,
    "total_orders": 1250,
    "response_time": 120,
    "joined_date": "2024-06-15T00:00:00Z"
  },
  
  "images": [
    {
      "url": "https://example.com/images/mouse-1.jpg",
      "alt": "Wireless Mouse Top View",
      "order": 1,
      "is_primary": true
    },
    {
      "url": "https://example.com/images/mouse-2.jpg",
      "alt": "Wireless Mouse Side View",
      "order": 2,
      "is_primary": false
    }
  ],
  
  "pricing": {
    "retail_price": 25.99,
    "bulk_price": 15.99,
    "currency": "USD",
    "minimum_quantity": 20,
    "savings_per_unit": 10.00,
    "savings_percentage": 38.5,
    "price_tiers": [
      {
        "min_quantity": 20,
        "max_quantity": 49,
        "price": 15.99,
        "total_savings": 200.00
      },
      {
        "min_quantity": 50,
        "max_quantity": 99,
        "price": 14.99,
        "total_savings": 550.00
      },
      {
        "min_quantity": 100,
        "max_quantity": null,
        "price": 13.99,
        "total_savings": 1200.00
      }
    ]
  },
  
  "stock": {
    "available": true,
    "quantity": 500,
    "reserved": 50,
    "available_quantity": 450,
    "low_stock_threshold": 100,
    "is_low_stock": false,
    "restocking_date": null
  },
  
  "specifications": {
    "brand": "TechMouse",
    "model": "TM-W200",
    "color": "Black",
    "wireless": true,
    "battery_type": "AA",
    "battery_life": "12 months",
    "dpi": "1600",
    "buttons": 3,
    "dimensions": "4.5 x 2.5 x 1.5 inches",
    "weight": "3.2 oz",
    "warranty": "1 year"
  },
  
  "shipping": {
    "weight": "10 lbs (bulk pack)",
    "dimensions": "15 x 12 x 8 inches",
    "free_shipping": true,
    "estimated_delivery": "5-7 business days",
    "ships_from": "California, USA"
  },
  
  "rating": {
    "average": 4.5,
    "count": 128,
    "distribution": {
      "5": 80,
      "4": 30,
      "3": 10,
      "2": 5,
      "1": 3
    }
  },
  
  "reviews": {
    "recent": [
      {
        "id": "uuid-review-1",
        "user": {
          "id": "uuid-user-1",
          "name": "John Doe",
          "avatar": "https://...",
          "verified_buyer": true
        },
        "rating": 5,
        "title": "Great bulk deal!",
        "comment": "Perfect for our office. Quality is excellent.",
        "helpful_count": 15,
        "images": ["https://..."],
        "created_at": "2025-01-20T14:30:00Z"
      }
    ],
    "total": 128
  },
  
  "stats": {
    "views": 1250,
    "orders": 45,
    "wishlisted": 89,
    "groups_interested": 12
  },
  
  "related_products": [
    {
      "id": "uuid-product-2",
      "name": "Wireless Keyboard Bulk Pack",
      "bulk_price": 35.99,
      "image": "https://...",
      "rating": 4.6
    }
  ],
  
  "badges": ["bulk_deal", "fast_shipping", "verified_vendor", "popular"],
  "tags": ["office", "wireless", "electronics", "productivity"],
  
  "status": "active",
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-26T08:00:00Z",
  "last_restocked": "2025-01-20T00:00:00Z"
}
```

**Business Logic:**

1. **Product Lookup:**
   - Find by ID or slug
   - Verify status = 'active' (or show all if vendor/admin)
   - Load all basic product data

2. **Data Enrichment:**
   - Load category hierarchy
   - Load vendor information
   - Calculate pricing tiers with savings
   - Load images ordered by order field
   - Calculate stock status

3. **Conditional Loading (based on include param):**
   - `vendor`: Load full vendor profile
   - `reviews`: Load recent reviews (5 most recent)
   - `related`: Load related products (same category or vendor)
   - `analytics`: Load view/order stats

4. **View Tracking:**
   - If authenticated, track user view
   - Increment view count (async)
   - Use for recommendations

5. **Badges Calculation:**
   - `bulk_deal`: savings_percentage > 30%
   - `fast_shipping`: estimated_delivery <= 3 days
   - `verified_vendor`: vendor.verified = true
   - `popular`: orders > 50 in last 30 days
   - `low_stock`: available_quantity < low_stock_threshold
   - `new`: created_at within last 30 days

**Error Responses:**

**404 Not Found:**
```json
{
  "error": "Product not found",
  "message": "The requested product does not exist or has been removed"
}
```

**410 Gone:**
```json
{
  "error": "Product unavailable",
  "message": "This product is no longer available",
  "status": "discontinued",
  "alternative_products": [
    {
      "id": "uuid-alt-product",
      "name": "Similar Product",
      "url": "/products/uuid-alt-product"
    }
  ]
}
```

---

### 3. GET /api/products/search

**Purpose:** Search products by keywords, filters, and criteria

**Authentication:** Not required (public)

**Query Parameters:**
- `q` (required) - Search query
- `category` (optional) - Filter by category
- `vendor_id` (optional) - Filter by vendor
- `min_price` (optional) - Minimum price
- `max_price` (optional) - Maximum price
- `in_stock` (optional, boolean) - Only in-stock
- `min_rating` (optional) - Minimum rating
- `sort_by` (optional) - `relevance`, `price`, `rating`, `newest`
- `limit` (optional) - Results per page (default: 20)
- `offset` (optional) - Pagination offset

**Request Example:**
```http
GET /api/products/search?q=wireless+mouse&category=electronics&in_stock=true&sort_by=relevance
```

**Response (200 OK):**
```json
{
  "query": "wireless mouse",
  "total_results": 45,
  "results": [
    {
      "id": "uuid-product-1",
      "name": "Wireless Mouse - Bulk Pack of 20",
      "slug": "wireless-mouse-bulk-pack-20",
      "description": "High-quality wireless mouse...",
      "bulk_price": 15.99,
      "retail_price": 25.99,
      "savings": 10.00,
      "image": "https://...",
      "vendor": {
        "name": "Tech Supplies Co",
        "verified": true
      },
      "rating": 4.5,
      "in_stock": true,
      "match_score": 0.95,
      "highlight": {
        "name": "<mark>Wireless Mouse</mark> - Bulk Pack",
        "description": "High-quality <mark>wireless mouse</mark> perfect for..."
      }
    }
  ],
  "suggestions": [
    "wireless keyboard",
    "bluetooth mouse",
    "office supplies"
  ],
  "filters": {
    "categories": [
      {
        "slug": "electronics",
        "name": "Electronics",
        "count": 35
      },
      {
        "slug": "office-supplies",
        "name": "Office Supplies",
        "count": 10
      }
    ],
    "price_ranges": [
      {
        "min": 0,
        "max": 20,
        "count": 15
      },
      {
        "min": 20,
        "max": 50,
        "count": 20
      },
      {
        "min": 50,
        "max": 100,
        "count": 10
      }
    ],
    "vendors": [
      {
        "id": "uuid-vendor-1",
        "name": "Tech Supplies Co",
        "count": 12
      }
    ]
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

1. **Search Strategy:**
   - Full-text search on product name, description, tags
   - Use PostgreSQL `to_tsvector` and `to_tsquery`
   - Weight fields: name (A), tags (B), description (C)
   - Calculate match score/relevance

2. **Query Processing:**
   - Tokenize search query
   - Remove stop words
   - Apply stemming
   - Build tsquery with AND/OR operators

3. **Ranking:**
   - `relevance`: Order by ts_rank
   - `price`: Order by bulk_price
   - `rating`: Order by average_rating
   - `newest`: Order by created_at

4. **Highlighting:**
   - Highlight matched terms in results
   - Use `ts_headline` for PostgreSQL
   - Wrap matches in `<mark>` tags

5. **Suggestions:**
   - Generate "Did you mean?" suggestions
   - Show related searches
   - Based on popular searches and products

6. **Faceted Search:**
   - Calculate available filters
   - Show counts per filter option
   - Allow filter combination

**Search Index:**
```sql
-- Create full-text search index
CREATE INDEX idx_products_search ON products 
USING GIN (to_tsvector('english', name || ' ' || description || ' ' || tags));

-- Weighted search query
SELECT 
  p.*,
  ts_rank(
    setweight(to_tsvector('english', p.name), 'A') ||
    setweight(to_tsvector('english', p.tags), 'B') ||
    setweight(to_tsvector('english', p.description), 'C'),
    to_tsquery('english', 'wireless & mouse')
  ) as rank
FROM products p
WHERE 
  to_tsvector('english', p.name || ' ' || p.description || ' ' || p.tags) @@ 
  to_tsquery('english', 'wireless & mouse')
ORDER BY rank DESC;
```

**Error Responses:**

**400 Bad Request:**
```json
{
  "error": "Invalid search query",
  "message": "Search query must be at least 2 characters"
}
```

---

### 4. GET /api/products/trending

**Purpose:** Get currently trending products

**Authentication:** Not required (public)

**Query Parameters:**
- `period` (optional) - Time period: `day`, `week`, `month` (default: `week`)
- `category` (optional) - Filter by category
- `limit` (optional) - Number of results (default: 10)

**Response (200 OK):**
```json
{
  "period": "week",
  "trending_products": [
    {
      "id": "uuid-product-1",
      "name": "Wireless Mouse Bulk Pack",
      "bulk_price": 15.99,
      "image": "https://...",
      "vendor": {
        "name": "Tech Supplies Co",
        "verified": true
      },
      "rating": 4.5,
      "trend": {
        "views_change": 150,
        "orders_change": 25,
        "trend_score": 0.95,
        "trending_since": "2025-01-20T00:00:00Z"
      },
      "badges": ["trending", "hot_deal"]
    }
  ]
}
```

**Business Logic:**

**Trend Calculation:**
```javascript
trend_score = (
  (views_this_period - views_last_period) / views_last_period * 0.3 +
  (orders_this_period - orders_last_period) / orders_last_period * 0.5 +
  (wishlists_this_period - wishlists_last_period) / wishlists_last_period * 0.2
)

// Higher weight on orders (50%), moderate on views (30%), lower on wishlists (20%)
```

**Trending Criteria:**
- Significant increase in views (>50%)
- Increase in orders (>20%)
- High conversion rate (views to orders)
- Recent activity spike

---

### 5. GET /api/products/featured

**Purpose:** Get featured/promoted products

**Authentication:** Not required (public)

**Query Parameters:**
- `category` (optional) - Filter by category
- `limit` (optional) - Number of results (default: 10)

**Response (200 OK):**
```json
{
  "featured_products": [
    {
      "id": "uuid-product-1",
      "name": "Wireless Mouse Bulk Pack",
      "bulk_price": 15.99,
      "retail_price": 25.99,
      "savings_percentage": 38.5,
      "image": "https://...",
      "vendor": {
        "name": "Tech Supplies Co",
        "verified": true
      },
      "rating": 4.5,
      "featured_reason": "Editor's Choice",
      "featured_until": "2025-02-15T00:00:00Z",
      "badges": ["featured", "editor_choice"]
    }
  ]
}
```

**Business Logic:**
- Products marked as featured by admin
- High-performing products (rating > 4.5, orders > 100)
- Vendor-promoted products (paid promotion)
- Seasonal picks
- Editor's choice

**Featured Prioritization:**
1. Paid promotions (vendors)
2. Admin-selected featured
3. High-performing products
4. Seasonal relevance

---

### 6. GET /api/products/recommendations

**Purpose:** Get personalized product recommendations

**Authentication:** Required

**Query Parameters:**
- `limit` (optional) - Number of results (default: 10)
- `type` (optional) - Recommendation type: `for_you`, `similar`, `trending`

**Response (200 OK):**
```json
{
  "recommendations": [
    {
      "id": "uuid-product-1",
      "name": "Wireless Mouse Bulk Pack",
      "bulk_price": 15.99,
      "image": "https://...",
      "rating": 4.5,
      "reason": "Based on your recent views",
      "confidence": 0.85
    }
  ],
  "recommendation_type": "for_you"
}
```

**Business Logic:**

**Recommendation Algorithm:**

1. **Collaborative Filtering:**
   - Users who bought X also bought Y
   - Users with similar purchase history

2. **Content-Based:**
   - Similar category
   - Similar price range
   - Same vendor

3. **User Behavior:**
   - Recently viewed products
   - Wishlisted products
   - Searched keywords

4. **Group Behavior:**
   - Popular in user's groups
   - Products other group members bought

**Recommendation Types:**
- `for_you`: Personalized based on all factors
- `similar`: Similar to recently viewed
- `trending`: Trending in user's interest areas

---

### 7. POST /api/products

**Purpose:** Create a new product (Vendor only)

**Authentication:** Required (Vendor role)

**Request Body:**
```json
{
  "name": "Wireless Mouse - Bulk Pack of 20",
  "description": "High-quality wireless mouse perfect for offices",
  "long_description": "Detailed product description...",
  "category_id": "uuid-cat-1",
  "images": [
    {
      "url": "https://example.com/image1.jpg",
      "alt": "Product view 1",
      "order": 1
    }
  ],
  "retail_price": 25.99,
  "bulk_price": 15.99,
  "minimum_quantity": 20,
  "price_tiers": [
    {
      "min_quantity": 20,
      "max_quantity": 49,
      "price": 15.99
    },
    {
      "min_quantity": 50,
      "max_quantity": 99,
      "price": 14.99
    },
    {
      "min_quantity": 100,
      "price": 13.99
    }
  ],
  "stock_quantity": 500,
  "low_stock_threshold": 100,
  "specifications": {
    "brand": "TechMouse",
    "model": "TM-W200",
    "color": "Black",
    "wireless": true
  },
  "shipping": {
    "weight": "10 lbs",
    "dimensions": "15x12x8",
    "free_shipping": true
  },
  "tags": ["office", "wireless", "electronics"],
  "status": "active"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Product created successfully",
  "product": {
    "id": "uuid-new-product",
    "slug": "wireless-mouse-bulk-pack-20",
    // ... full product details
    "created_at": "2025-01-26T14:00:00Z"
  }
}
```

**Business Logic:**

1. **Vendor Verification:**
   - Check user is vendor
   - Check vendor status = 'approved'
   - Check vendor has permission to add products

2. **Validation:**
   - Required fields present
   - Prices are valid (bulk_price < retail_price)
   - Minimum quantity >= 1
   - Price tiers are valid (ascending quantities, descending prices)
   - Category exists
   - Images are valid URLs

3. **Slug Generation:**
   - Generate URL-friendly slug from name
   - Ensure slug is unique
   - Add number suffix if duplicate

4. **Image Processing:**
   - Validate image URLs
   - Optionally download and resize
   - Set primary image

5. **Product Creation:**
   - Insert into products table
   - Link to vendor
   - Set initial stock
   - Set status (may be 'pending' for review)

6. **Post-Creation:**
   - Index for search
   - Notify admin if requires approval
   - Log creation event

**Validation Rules:**
```javascript
{
  name: { required: true, minLength: 3, maxLength: 200 },
  description: { required: true, maxLength: 1000 },
  category_id: { required: true, exists: 'categories' },
  retail_price: { required: true, min: 0.01 },
  bulk_price: { required: true, min: 0.01, lessThan: 'retail_price' },
  minimum_quantity: { required: true, min: 1 },
  stock_quantity: { required: true, min: 0 },
  images: { required: true, minLength: 1, maxLength: 10 }
}
```

**Error Responses:**

**403 Forbidden:**
```json
{
  "error": "Vendor not approved",
  "message": "Your vendor account must be approved before adding products"
}
```

**400 Bad Request:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "bulk_price",
      "message": "Bulk price must be less than retail price"
    }
  ]
}
```

---

### 8. PUT /api/products/:id

**Purpose:** Update product details (Vendor only, own products)

**Authentication:** Required (Vendor role)

**Request Body (all fields optional):**
```json
{
  "name": "Updated Product Name",
  "description": "Updated description",
  "bulk_price": 14.99,
  "stock_quantity": 600,
  "price_tiers": [
    // updated tiers
  ],
  "specifications": {
    // updated specs
  },
  "status": "active"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Product updated successfully",
  "product": {
    // updated product details
    "updated_at": "2025-01-26T15:00:00Z"
  }
}
```

**Business Logic:**

1. **Authorization:**
   - Verify user is vendor
   - Verify product belongs to vendor
   - Or user is admin (can edit any product)

2. **Validation:**
   - Same validation as create
   - Only update provided fields
   - Maintain data integrity

3. **Price Change Handling:**
   - If price changes significantly (>10%), notify groups
   - Update price history
   - Notify users with product in wishlist

4. **Stock Update:**
   - If stock changes, update availability
   - Notify if back in stock
   - Alert if low stock

5. **Status Change:**
   - If changing to 'inactive', notify groups with pending orders
   - If changing to 'discontinued', suggest alternatives

**Error Responses:**

**403 Forbidden:**
```json
{
  "error": "Unauthorized",
  "message": "You can only edit your own products"
}
```

**400 Bad Request:**
```json
{
  "error": "Cannot update product",
  "message": "Product has active orders and cannot be modified",
  "active_orders": 5
}
```

---

### 9. DELETE /api/products/:id

**Purpose:** Delete product (Vendor only, soft delete preferred)

**Authentication:** Required (Vendor role)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

**Business Logic:**

1. **Authorization:**
   - Verify product belongs to vendor
   - Or user is admin

2. **Pre-Deletion Checks:**
   - Check no active orders
   - Check no pending group interests
   - Resolve all issues

3. **Soft Delete:**
   - Set status = 'deleted'
   - Keep data for history
   - Remove from search index

4. **Notifications:**
   - Notify users with product in wishlist
   - Suggest alternative products

**Error Responses:**

**400 Bad Request:**
```json
{
  "error": "Cannot delete product",
  "message": "Product has active orders",
  "active_orders": 3
}
```

---

### 10. PATCH /api/products/:id/stock

**Purpose:** Update stock quantity (Vendor only)

**Authentication:** Required (Vendor role)

**Request Body:**
```json
{
  "quantity": 600,
  "operation": "set"
}
```

**Operations:**
- `set`: Set absolute quantity
- `add`: Add to current quantity
- `subtract`: Subtract from current quantity

**Response (200 OK):**
```json
{
  "success": true,
  "product_id": "uuid-product-1",
  "previous_quantity": 500,
  "new_quantity": 600,
  "available_quantity": 550,
  "reserved": 50
}
```

**Business Logic:**
- Update stock atomically
- Calculate available (quantity - reserved)
- Notify if back in stock
- Alert if low stock
- Track stock history

---

### 11. PATCH /api/products/:id/status

**Purpose:** Change product status (Vendor/Admin only)

**Authentication:** Required (Vendor role)

**Request Body:**
```json
{
  "status": "inactive",
  "reason": "Out of season"
}
```

**Status Values:**
- `active`: Available for purchase
- `inactive`: Temporarily unavailable
- `discontinued`: Permanently unavailable
- `pending`: Awaiting approval

**Response (200 OK):**
```json
{
  "success": true,
  "product_id": "uuid-product-1",
  "previous_status": "active",
  "new_status": "inactive",
  "changed_at": "2025-01-26T16:00:00Z"
}
```

**Business Logic:**
- Validate status transition
- Notify affected users
- Update availability
- Log status change

---

### 12. GET /api/products/categories

**Purpose:** List all product categories

**Authentication:** Not required (public)

**Response (200 OK):**
```json
{
  "categories": [
    {
      "id": "uuid-cat-1",
      "name": "Electronics",
      "slug": "electronics",
      "description": "Electronic devices and accessories",
      "image": "https://...",
      "product_count": 150,
      "parent_id": null,
      "subcategories": [
        {
          "id": "uuid-subcat-1",
          "name": "Computers",
          "slug": "computers",
          "product_count": 50
        }
      ]
    }
  ]
}
```

---

### 15. GET /api/products/:id/reviews

**Purpose:** Get product reviews

**Authentication:** Not required (public)

**Query Parameters:**
- `rating` (optional) - Filter by rating
- `verified_only` (optional, boolean) - Only verified buyers
- `sort_by` (optional) - `recent`, `helpful`, `rating_high`, `rating_low`
- `limit` (optional) - Results per page (default: 20)
- `offset` (optional)

**Response (200 OK):**
```json
{
  "product_id": "uuid-product-1",
  "rating_summary": {
    "average": 4.5,
    "count": 128,
    "distribution": {
      "5": 80,
      "4": 30,
      "3": 10,
      "2": 5,
      "1": 3
    },
    "verified_purchases": 95
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
      "title": "Excellent product!",
      "comment": "Great quality and fast shipping. Highly recommend for bulk orders.",
      "helpful_count": 25,
      "not_helpful_count": 2,
      "images": [
        "https://example.com/review-image-1.jpg"
      ],
      "verified_purchase": true,
      "vendor_response": {
        "comment": "Thank you for your review!",
        "responded_at": "2025-01-21T10:00:00Z"
      },
      "created_at": "2025-01-20T14:30:00Z",
      "updated_at": "2025-01-20T14:30:00Z"
    }
  ],
  "pagination": {
    "total": 128,
    "limit": 20,
    "offset": 0
  }
}
```

---

### 16. POST /api/products/:id/reviews

**Purpose:** Add a product review

**Authentication:** Required

**Request Body:**
```json
{
  "rating": 5,
  "title": "Excellent product!",
  "comment": "Great quality and fast shipping.",
  "images": [
    "https://example.com/my-photo.jpg"
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Review submitted successfully",
  "review": {
    "id": "uuid-new-review",
    // ... review details
  }
}
```

**Business Logic:**
- Check user purchased product (verified review)
- One review per user per product
- Validate rating (1-5)
- Moderate inappropriate content
- Update product rating average
- Notify vendor of new review

---

### 20. GET /api/products/wishlist

**Purpose:** Get user's wishlist

**Authentication:** Required

**Response (200 OK):**
```json
{
  "wishlist": [
    {
      "product": {
        "id": "uuid-product-1",
        "name": "Wireless Mouse",
        "bulk_price": 15.99,
        "image": "https://...",
        "in_stock": true
      },
      "added_at": "2025-01-20T10:00:00Z",
      "price_at_add": 15.99,
      "price_changed": false,
      "stock_alert": false
    }
  ],
  "total": 5
}
```

---

### 21. POST /api/products/wishlist

**Purpose:** Add product to wishlist

**Authentication:** Required

**Request Body:**
```json
{
  "product_id": "uuid-product-1"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Added to wishlist",
  "wishlist_count": 6
}
```

---

## 🗄️ Database Tables

### products
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  category_id UUID NOT NULL REFERENCES categories(id),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(250) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  long_description TEXT,
  retail_price DECIMAL(10,2) NOT NULL,
  bulk_price DECIMAL(10,2) NOT NULL,
  minimum_quantity INT NOT NULL DEFAULT 1,
  stock_quantity INT NOT NULL DEFAULT 0,
  reserved_quantity INT DEFAULT 0,
  low_stock_threshold INT DEFAULT 10,
  specifications JSONB,
  shipping_info JSONB,
  tags TEXT[],
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued', 'pending')),
  views_count INT DEFAULT 0,
  orders_count INT DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  reviews_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_vendor ON products(vendor_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_price ON products(bulk_price);
CREATE INDEX idx_products_search ON products USING GIN(to_tsvector('english', name || ' ' || description || ' ' || tags));
```

### product_images
```sql
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(200),
  display_order INT DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### product_price_tiers
```sql
CREATE TABLE product_price_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  min_quantity INT NOT NULL,
  max_quantity INT,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### product_reviews
```sql
CREATE TABLE product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(200),
  comment TEXT,
  verified_purchase BOOLEAN DEFAULT false,
  helpful_count INT DEFAULT 0,
  not_helpful_count INT DEFAULT 0,
  vendor_response TEXT,
  vendor_response_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, user_id)
);
```

### wishlists
```sql
CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price_at_add DECIMAL(10,2),
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);
```

---

## 🎉 Summary

The **Products Routes** provide a complete product management system with:

- ✅ **Product Browsing** - Search, filter, sort
- ✅ **Bulk Pricing** - Tiered pricing, savings calculation
- ✅ **Vendor Management** - Create, update products
- ✅ **Reviews & Ratings** - User feedback system
- ✅ **Wishlist** - Save products for later
- ✅ **Recommendations** - Personalized suggestions
- ✅ **Categories** - Organized product taxonomy
- ✅ **Stock Management** - Real-time inventory
- ✅ **Analytics** - Track views, orders, trends

All endpoints support the core bulk purchasing experience! 🛍️
